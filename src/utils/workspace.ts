import pDebounce from 'p-debounce';
import { Uri, workspace } from 'vscode';
import { basename, join, normalize } from 'path';
import { stat } from 'fs/promises';
import { clearResourceCache, getDefaultConfig, readConfig, validateFolder, validateFolderWithDirtyFiles, validateResourcesFromFolder } from './validation';
import { generateId } from './helpers';
import { SETTINGS, DEFAULT_CONFIG_FILE_NAME, RUN_OPTIONS } from '../constants';
import { getFileCacheId, getResourcesFromFile, getResourcesFromFileAndContent, isSubpath, isYamlFile } from './file-parser';
import logger from '../utils/logger';
import globals from '../utils/globals';
import type { WorkspaceFolder, Disposable, TextDocument, TextDocumentChangeEvent } from 'vscode';
import type { RuntimeContext } from './runtime-context';
import type { Resource } from './file-parser';

export type Folder = WorkspaceFolder & {id: string};

export type WorkspaceFolderConfig = {
  type: 'default' | 'file' | 'config' | 'remote';
  config: any;
  owner: Folder,
  isValid: boolean;
  path?: string;
  fileName?: string;
  remoteProjectName?: string;
};

const ON_TYPE_DEBOUNCE_MS = 500;
const ON_SAVE_DEBOUNCE_MS = 250;

export function getWorkspaceFolders(): Folder[] {
  return [...(workspace.workspaceFolders ?? [])]
    .map(folder => ({
      id: generateId(folder.uri.fsPath),
      ...folder,
    }));
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
    const onDidChangeTextDocumentListener = async (e: TextDocumentChangeEvent) => {
      logger.log('Validating: Document changed', e.document.uri.fsPath, e, e.document.getText());
      await runFileWithContentValidation(e.document.uri, e.document.getText(), workspaceFolders, context);
    };
    const debouncedListener = pDebounce(onDidChangeTextDocumentListener, ON_TYPE_DEBOUNCE_MS);

    const documentWatcher = workspace.onDidChangeTextDocument(debouncedListener);

    watchers.push(documentWatcher);
  }

  if (globals.run === RUN_OPTIONS.onSave) {
    // There can be multiple save events at once - for example I have "save on blur" plugin which saves all the edited files
    // when VSC window loses focus. For each file save event is triggered separately.
    // So here we want to debounced a listener but also capture input (file) for each listener call.
    const affectedFiles = new Map<string, Uri>();

    const onDidSaveTextDocumentListener = async () => {
      const savedFiles = Array.from(affectedFiles.values());

      logger.log('Validating: Documents saved', savedFiles);

      affectedFiles.clear();
      await runFilesValidation(savedFiles, workspaceFolders, context);
    };
    const debouncedListener = pDebounce(onDidSaveTextDocumentListener, ON_SAVE_DEBOUNCE_MS);
    const groupingListener = async (e: TextDocument) => {
      affectedFiles.set(e.uri.fsPath, e.uri);
      await debouncedListener();
    };

    const documentSavedWatcher = workspace.onDidSaveTextDocument(groupingListener);

    watchers.push(documentSavedWatcher);
  }

  const documentCreatedWatcher = workspace.onDidCreateFiles(async (e) => {
    logger.log('Validating: Documents created', e.files.map(file => file.fsPath));
    await runFilesValidation(e.files, workspaceFolders, context);
  });

  const documentDeletedWatcher = workspace.onDidDeleteFiles(async (e) => {
    logger.log('Validating: Documents deleted', e.files.map(file => file.fsPath));
    await validateResources([], workspaceFolders, context, { incremental: false, dirtyFiles: e.files });
  });

  watchers.push(documentCreatedWatcher, documentDeletedWatcher);

  return watchers;
}

async function runFileWithContentValidation(file: Uri, content: string,  workspaceFolders: Folder[], context: RuntimeContext) {
  if (!isYamlFile(file.fsPath)) {
    return;
  }

  context.isValidating = true;

  const configChanged = await isConfigFileAffected(workspaceFolders, [file]);

  const previousFileResourceId = getFileCacheId(file.fsPath);
  const resources = await getResourcesFromFileAndContent(file.fsPath, content);
  const currentFileResourceId = getFileCacheId(file.fsPath);

  logger.log(
    `runFileWithContentValidation, path: ${file.fsPath}, incremental: ${previousFileResourceId === currentFileResourceId}, count: ${resources.length}`
  );

  // We use incremental validation only when there are same resources in the file (thus previousFileResourceId === currentFileResourceId).
  // Even if not incremental we need to pass dirty content to validation so it's not read from disk again for dirty file.
  const incremental = previousFileResourceId === currentFileResourceId && !configChanged;
  if (incremental) {
    await validateResources(resources, workspaceFolders, context, { incremental: true });
  } else {
    await validateResources(resources, workspaceFolders, context, { incremental: false, dirtyFiles: [file], configChanged });
  }


  context.isValidating = false;
}

async function runFilesValidation(files: readonly Uri[], workspaceFolders: Folder[], context: RuntimeContext) {
  const yamlFiles = files.filter(file => isYamlFile(file.fsPath));
  if (yamlFiles.length === 0) {
    return;
  }

  context.isValidating = true;

  const configChanged = await isConfigFileAffected(workspaceFolders, files);

  let useIncremental = !configChanged;

  const resources = (await Promise.all(files.map(async (file) => {
    const previousFileResourceId = getFileCacheId(file.fsPath);
    const resources = await getResourcesFromFile(file.fsPath);
    const currentFileResourceId = getFileCacheId(file.fsPath);

    useIncremental = useIncremental && previousFileResourceId === currentFileResourceId;

    return resources;
  }))).flat().filter(Boolean);

  logger.log(
    `runFilesValidation, paths: ${files.map(f => f.path).join(';')}, incremental: ${useIncremental}, count: ${resources.length}`
  );

  if (useIncremental) {
    await validateResources(resources, workspaceFolders, context, { incremental: useIncremental });
  } else {
    await validateResources(resources, workspaceFolders, context, { incremental: useIncremental, dirtyFiles: yamlFiles, configChanged });
  }

  context.isValidating = false;
}

// For each file
// - map it to resource
// - group by workspace folder
// - clear its validation cache (it requires workspace folder and resource id)
// - run workspace validation or resource only validation
async function validateResources(
  resources: Resource[],
  workspaceFolders: Folder[],
  context: RuntimeContext,
  options: { incremental: boolean, dirtyFiles?: readonly Uri[], configChanged?: boolean } = { incremental: false }
) {
  const resourcesByWorkspace: Record<string, {workspace: Folder, resources: any}> = resources.reduce((acc, resource) => {
    const ownerWorkspace = workspaceFolders.find(folder => isSubpath(folder.uri, resource.filePath));
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

  const isDirty = options.dirtyFiles?.length > 0;
  if (isDirty) {
    // This is a special case when you remove content of entire file. In this case we don't have
    // any resources from this file, but we still need to run validation for owner workspace (since number of resources
    // and its' content changed) so we use dirty file paths to find modified workspaces.
    options.dirtyFiles.forEach(dirtyFile => {
      const ownerWorkspace = workspaceFolders.find(folder => isSubpath(folder.uri, dirtyFile.fsPath));

      if (ownerWorkspace) {
        resourcesByWorkspace[ownerWorkspace.id] = resourcesByWorkspace[ownerWorkspace.id] ?? { workspace: ownerWorkspace, resources: [] };
      }
    });
  }

  logger.log('validateResources', resources, workspaceFolders, resourcesByWorkspace, options);

  let resultUris: Uri[] = [];
  // 1. If incremental, validate only changed files.
  // 2. Else run validation on the entire folder (dirty resources + rest of workspace files read from disk).
  if (options.incremental && !isDirty && !options.configChanged) {
    resultUris = await Promise.all(Object.values(resourcesByWorkspace).map(async workspaceData => {
      await clearResourceCache(workspaceData.workspace, resources.map(resource => resource.id));
      return await validateResourcesFromFolder(workspaceData.resources, workspaceData.workspace, true);
    }));
  } else {
    resultUris = await Promise.all(Object.values(resourcesByWorkspace).map(async workspaceData => {
      await clearResourceCache(workspaceData.workspace, resources.map(resource => resource.id));
      return await validateFolderWithDirtyFiles(workspaceData.workspace, workspaceData.resources, options.dirtyFiles ?? []);
    }));
  }

  if (resultUris.length > 0) {
    await context.sarifWatcher.addMany(resultUris);
  }

  return resultUris;
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

async function isConfigFileAffected(workspaces: Folder[], files: readonly Uri[]) {
  const results = await Promise.all(workspaces.map(async workspace => {
    const currentConfig = await getWorkspaceConfig(workspace);
    if (currentConfig.isValid && (currentConfig.type === 'file' || currentConfig.type === 'config')) {
      const configPath = Uri.file(currentConfig.path).toString();
      const configChanged = files.find(file => file.toString() === configPath);

      return Boolean(configChanged);
    }

    return false;
  }));

  return results.reduce((prev, cur) => prev || cur, false);
}
