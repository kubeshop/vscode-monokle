import { RelativePattern, Uri, workspace } from 'vscode';
import { basename, join, normalize } from 'path';
import { stat } from 'fs/promises';
import { clearResourceCache, getDefaultConfig, readConfig, validateFolder, validateResourcesFromFolder } from './validation';
import { generateId } from './helpers';
import { SETTINGS, DEFAULT_CONFIG_FILE_NAME, RUN_OPTIONS } from '../constants';
import { extractK8sResources } from './parser';
import logger from '../utils/logger';
import globals from '../utils/globals';
import type { WorkspaceFolder, Disposable } from 'vscode';
import type { RuntimeContext } from './runtime-context';

export type Folder = WorkspaceFolder & {id: string};

export type File = {
  id: string;
  name: string;
  path: string;
};

export type WorkspaceFolderConfig = {
  type: 'default' | 'file' | 'config' | 'remote';
  config: any;
  owner: Folder,
  isValid: boolean;
  path?: string;
  fileName?: string;
  remoteProjectName?: string;
};

type Resource = Awaited<ReturnType<typeof getResourceFromPath>>;

export function getWorkspaceFolders(): Folder[] {
  return [...(workspace.workspaceFolders ?? [])]
    .map(folder => ({
      id: generateId(folder.uri.fsPath),
      ...folder,
    }));
}

export async function getWorkspaceResources(workspaceFolder: Folder) {
  const resourceFiles = await findYamlFiles(workspaceFolder.uri.fsPath);
  return convertFilesToK8sResources(resourceFiles);
}

// Config precedence:
// 1. Remote policy (if user logged in).
//   - If there is an error fetching (any other than NO_POLICY), fallback to other options.
//   - If there is NO_POLICY error, treat as invalid config (as we assume, user intention is to use remote policy).
// 2. Config from settings (if exists).
// 3. Local config (if exists).
// 4. Default config.
export async function getWorkspaceConfig(workspaceFolder: Folder): Promise<WorkspaceFolderConfig> {
  const user = await globals.getUser();

  if (user.isAuthenticated) {
    const policyData = await globals.getRemotePolicy(workspaceFolder.uri.fsPath);
    const projectName = await globals.getRemoteProjectName(workspaceFolder.uri.fsPath);
    const folderStatus = globals.getFolderStatus(workspaceFolder);

    // Use remote config when it is valid or when there is NO_POLICY error (meaning repo is already part
    // of a project in Monokle Cloud which only lacks policy, so we assume user intention is to use remote policy).
    if (policyData.valid || folderStatus?.error?.startsWith('NO_POLICY')) {
      return {
        type: 'remote',
        config: policyData.policy,
        owner: workspaceFolder,
        isValid: policyData.valid,
        path: policyData.path,
        fileName: basename(policyData.path),
        remoteProjectName: projectName,
      };
    }
  }

  const settingsConfigurationPath = workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.CONFIGURATION_PATH);
  if (settingsConfigurationPath) {
    const configPath = normalize(settingsConfigurationPath);
    const configAsJson = await readConfig(configPath);
    return {
      type: 'config',
      config: configAsJson,
      owner: workspaceFolder,
      isValid: configAsJson !== undefined,
      path: configPath,
      fileName: basename(configPath)
    };
  }

  const hasLocal = await hasLocalConfig(workspaceFolder);
  if (hasLocal) {
    const localConfig = await getWorkspaceLocalConfig(workspaceFolder);
    return {
      type: 'file',
      config: localConfig,
      owner: workspaceFolder,
      isValid: localConfig !== undefined,
      path: normalize(join(workspaceFolder.uri.fsPath, DEFAULT_CONFIG_FILE_NAME)),
      fileName: DEFAULT_CONFIG_FILE_NAME,
    };
  }

  return {
    type: 'default',
    config: await getDefaultConfig(),
    owner: workspaceFolder,
    isValid: true,
  };
}

export function initializeWorkspaceWatchers(workspaceFolders: Folder[], context: RuntimeContext) {
  const watchers: Disposable[] = [];

  if (globals.run === RUN_OPTIONS.onType) {
    const documentWatcher = workspace.onDidChangeTextDocument(async (e) => {
      logger.log('Validating: Document changed', e.document.uri.fsPath, e, e.document.getText());
      // @TODO should be deobounced too
      await runFileWithContentValidation(e.document.uri, e.document.getText(), workspaceFolders, context);
    });

    watchers.push(documentWatcher);
  }

  if (globals.run === RUN_OPTIONS.onSave) {
    const documentSavedWatcher = workspace.onDidSaveTextDocument(async (e) => {
      // @TODO
      // There can be multiple events at once, for example I have save on focus plugin,
      // this means I can edit multiple files and when VSC window loses focus it will save all
      // which will trigger multiple events at once.
      // I think we should group them and run validation only once with debounce/throttling.
      logger.log('Validating: Document saved', e.uri.fsPath);
      await runFilesValidation([e.uri], workspaceFolders, context, true);
    });

    watchers.push(documentSavedWatcher);
  }

  const documentCreatedWatcher = workspace.onDidCreateFiles(async (e) => {
    logger.log('Validating: Documents created', e.files.map(file => file.fsPath));
    await runFilesValidation(e.files, workspaceFolders, context, true);
  });

  const documentDeletedWatcher = workspace.onDidDeleteFiles(async (e) => {
    logger.log('Validating: Documents deleted', e.files.map(file => file.fsPath));
    await runFilesValidation(e.files, workspaceFolders, context, false);
  });

  watchers.push(documentCreatedWatcher, documentDeletedWatcher);

  return watchers;
}

async function runFileWithContentValidation(file: Uri, content: string,  workspaceFolders: Folder[], context: RuntimeContext) {
  if (!isYamlFile(file.fsPath)) {
    return;
  }

  context.isValidating = true;

  const resource = await getResourceFromPathAndContent(file.path, content);
  const resultUris = await validateResources([resource], workspaceFolders, true);

  await context.sarifWatcher.addMany(resultUris);

  context.isValidating = false;
}

async function runFilesValidation(files: readonly Uri[], workspaceFolders: Folder[], context: RuntimeContext, incremental: boolean) {
  const yamlFiles = files.filter(file => isYamlFile(file.fsPath));
  if (yamlFiles.length === 0) {
    return;
  }

  context.isValidating = true;

  const resources = (await Promise.all(files.map(file => getResourceFromPath(file.path)))).filter(Boolean);
  const resultUris = await validateResources(resources, workspaceFolders, incremental);

  await context.sarifWatcher.addMany(resultUris);

  context.isValidating = false;
}

// For each file
// - map it to resource
// - group by workspace folder
// - clear its validation cache (it requires workspace folder and resource id)
// - run workspace validation
async function validateResources(resources: Resource[], workspaceFolders: Folder[], incremental = false) {
  const resourcesByWorkspace: Record<string, {workspace: Folder, resources: any}> = resources.reduce((acc, resource) => {
    const ownerWorkspace = workspaceFolders.find(folder => resource.filePath.startsWith(folder.uri.fsPath));
    if (!ownerWorkspace) {
      return acc;
    }

    const workspaceData = acc[ownerWorkspace.id] ?? { workspace: ownerWorkspace, resources: [] };
    workspaceData.resources.push(resource);

    return {
      ...acc,
      [ownerWorkspace.id]: workspaceData,
    };
  }, {});

  let resultUris: Uri[] = [];

  // If incremental, validate only changed files, else run validation on the entire folder.
  if (incremental) {
    resultUris = await Promise.all(Object.values(resourcesByWorkspace).map(async workspaceData => {
      await clearResourceCache(workspaceData.workspace, resources.map(resource => resource.id));
      return await validateResourcesFromFolder(workspaceData.resources, workspaceData.workspace, true);
    }));
  } else {
    resultUris = await Promise.all(Object.values(resourcesByWorkspace).map(async workspaceData => {;
      await clearResourceCache(workspaceData.workspace, resources.map(resource => resource.id));
      return await validateFolder(workspaceData.workspace);
    }));
  }

  return resultUris;
}

async function findYamlFiles(folderPath: string): Promise<File[]> {
  const files = await workspace.findFiles(new RelativePattern(folderPath, '**/*.{yaml,yml}'));

  return files
    .map(file => {
      const fullPath = file.fsPath;

      return {
        id: generateId(fullPath),
        name: basename(fullPath),
        path: fullPath
      };
    });
}

async function convertFilesToK8sResources(files: File[]): Promise<ReturnType<Awaited<typeof extractK8sResources>>> {
  const filesWithContent = await Promise.all(files.map(async file => {
    const contentRaw = await workspace.fs.readFile(Uri.file(file.path));
    const content = Buffer.from(contentRaw.buffer).toString('utf8');

    return {
      id: file.id,
      path: file.path,
      content
    };
  }));

  return extractK8sResources(filesWithContent);
}

async function hasLocalConfig(workspaceFolder: Folder) {
  const configPath = normalize(join(workspaceFolder.uri.fsPath, DEFAULT_CONFIG_FILE_NAME));
  try {
    await stat(configPath);
    return true;
  } catch (e) {
    return false;
  }
}

async function getWorkspaceLocalConfig(workspaceFolder: Folder) {
  const configPath = normalize(join(workspaceFolder.uri.fsPath, DEFAULT_CONFIG_FILE_NAME));
  return readConfig(configPath);
}

async function getResourceFromPath(path: string) {
  const file = {
    id: generateId(path),
    name: basename(path),
    path: path
  };

  const resources = file ? await convertFilesToK8sResources([file]) : [];
  return resources.pop() ?? null;
}

async function getResourceFromPathAndContent(path: string, content: string) {
  const file = {
    id: generateId(path),
    name: basename(path),
    path: path
  };

  const resources = await extractK8sResources([{
    id: file.id,
    path: file.path,
    content
  }]);

  return resources.pop() ?? null;
}

function isYamlFile(path: string) {
  return path.endsWith('.yaml') || path.endsWith('.yml');
}
