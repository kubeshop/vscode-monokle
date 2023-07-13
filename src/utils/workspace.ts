import { RelativePattern, Uri, workspace } from 'vscode';
import { basename, join, normalize } from 'path';
import { Resource, extractK8sResources } from './extract';
import { clearResourceCache, getDefaultConfig, getValidationResultPath, readConfig, validateFolder } from './validation';
import { generateId } from './helpers';
import { SETTINGS, DEFAULT_CONFIG_FILE_NAME, REMOTE_POLICY_FILE_SUFFIX } from '../constants';
import logger from '../utils/logger';
import globals from '../utils/globals';
import type { WorkspaceFolder } from 'vscode';
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
};

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

export async function getWorkspaceConfig(workspaceFolder: Folder): Promise<WorkspaceFolderConfig> {
  const remotePolicyUrl = workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.REMOTE_POLICY_URL);
  if (remotePolicyUrl) {
    const configData = await getWorkspaceRemoteConfig(workspaceFolder);
    return {
      type: 'remote',
      config: configData,
      owner: workspaceFolder,
      isValid: configData !== undefined,
      path: normalize(join(globals.storagePath, `${workspaceFolder.id}${REMOTE_POLICY_FILE_SUFFIX}`)),
      fileName: `${workspaceFolder.id}${REMOTE_POLICY_FILE_SUFFIX}`,
    };
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

  const localConfig = await getWorkspaceLocalConfig(workspaceFolder);
  if (localConfig) {
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
  // On change we don't want to run whole validate command again (unless this is very first run @TODO).
  // Because:
  // The sarif output file is already there, initiated with sarif..openLogs
  // This means sarif ext has a watcher on this file, whenever it changes it will update the sarif view.
  // So we just need to update the sarif output file, based on new validation result.
  // For that:
  // - match changes with the workspace folder
  // - get validator for each workspace folder
  // - run validate command for each workspace folder (incremental?)
  // - save validation results to sarif output file
  // - sarif should reload automatically
  return workspaceFolders.map((folder) => {
    const pattern = new RelativePattern(folder.uri.fsPath, '**/*.{yaml,yml}');
    const watcher = workspace.createFileSystemWatcher(pattern);
    const resultFile = getValidationResultPath(context.extensionContext.extensionPath, folder.id);

    const revalidateFolder = async () => {
      logger.log('revalidateFolder', folder);

      context.isValidating = true;

      await validateFolder(folder, context.extensionContext);
      await context.sarifWatcher.add(Uri.file(resultFile));

      context.isValidating = false;
    };

    const resetResourceCache = async (filePath: string) => {
      const resourceId = await getResourceIdFromPath(folder, filePath);

      if (!resourceId) {
        return;
      }

      return clearResourceCache(folder, resourceId);
    };

    watcher.onDidChange(async (uri) => {
      logger.log(`File ${uri.fsPath} has been changed`);
      await resetResourceCache(uri.fsPath);
      await revalidateFolder();
    });

    watcher.onDidCreate(async (uri) => {
      logger.log(`File ${uri.fsPath} has been created`);
      await revalidateFolder();
    });

    watcher.onDidDelete(async (uri) => {
      logger.log(`File ${uri.fsPath} has been deleted`);
      await revalidateFolder();
    });

    return watcher;
  });
}

async function findYamlFiles(folderPath: string): Promise<File[]> {
  const files = await workspace.findFiles(new RelativePattern(folderPath, '**/*.{yaml,yml}'));

  return files
    .map(file => {
      const fullPath = file.fsPath;

      return {
        id: generateId(fullPath),
        name: basename(file.fsPath),
        path: fullPath
      };
    });
}

async function convertFilesToK8sResources(files: File[]): Promise<Resource[]> {
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

async function getWorkspaceLocalConfig(workspaceFolder: Folder) {
  const configPath = normalize(join(workspaceFolder.uri.fsPath, DEFAULT_CONFIG_FILE_NAME));
  return readConfig(configPath);
}

async function getWorkspaceRemoteConfig(workspaceFolder: Folder) {
  const configPath = normalize(join(globals.storagePath, `${workspaceFolder.id}${REMOTE_POLICY_FILE_SUFFIX}`));
  return readConfig(configPath);
}

async function getResourceIdFromPath(folder: Folder, path: string) {
  const files = await findYamlFiles(folder.uri.fsPath);
  const file = files.find(file => normalize(file.path) === normalize(path));
  const resources = file ? await convertFilesToK8sResources([file]) : [];

  return resources.pop()?.id ?? null;
}
