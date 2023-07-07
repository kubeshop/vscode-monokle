import { RelativePattern, Uri, workspace } from 'vscode';
import { readFile, readdir } from 'fs/promises';
import { basename, extname, join, normalize } from 'path';
import { Resource, extractK8sResources } from './extract';
import { getDefaultConfig, getValidationResultPath, readConfig, validateFolder } from './validation';
import { generateId } from './helpers';
import { SETTINGS, DEFAULT_CONFIG_FILE_NAME } from '../constants';
import logger from '../utils/logger';
import type { WorkspaceFolder } from 'vscode';
import type { RuntimeContext } from './runtime-context';

export type Folder = WorkspaceFolder & {id: string};

export type File = {
  id: string;
  name: string;
  path: string;
};

export type WorkspaceFolderConfig = {
  type: 'default' | 'file' | 'config';
  config: any;
  owner: Folder,
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
  const settingsConfigurationPath = workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.CONFIGURATION_PATH);

  if (settingsConfigurationPath) {
    const configPath = normalize(settingsConfigurationPath);
    // @TODO show error if config empty

    const config =  {
      type: 'config',
      config: await readConfig(configPath),
      owner: workspaceFolder,
      path: configPath,
      fileName: basename(configPath),
    };

    return config as WorkspaceFolderConfig;
  }

  const localConfig = await getWorkspaceLocalConfig(workspaceFolder);
  if (localConfig && Object.entries(localConfig).length > 0) {
    return {
      type: 'file',
      config: localConfig,
      owner: workspaceFolder,
      path: normalize(join(workspaceFolder.uri.fsPath, DEFAULT_CONFIG_FILE_NAME)),
      fileName: DEFAULT_CONFIG_FILE_NAME,
    };
  }

  return {
    type: 'default',
    config: await getDefaultConfig(workspaceFolder),
    owner: workspaceFolder,
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

    watcher.onDidChange((uri) => {
      logger.log(`File ${uri.fsPath} has been changed`);
      revalidateFolder();
    });

    watcher.onDidCreate((uri) => {
      logger.log(`File ${uri.fsPath} has been created`);
      revalidateFolder();
    });

    watcher.onDidDelete((uri) => {
      logger.log(`File ${uri.fsPath} has been deleted`);
      revalidateFolder();
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
    const content = await readFile(file.path, 'utf-8');

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
