import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

import { Resource, extractK8sResources } from './extract';
import { getValidationResult, readConfig, validateFolder } from './validation';
import { generateId } from './helpers';

export type File = {
  id: string;
  name: string;
  path: string;
};

export type WorkspaceFolder = vscode.WorkspaceFolder & {id: string};

export function getWorkspaceFolders(): WorkspaceFolder[] {
  return [...(vscode.workspace.workspaceFolders ?? [])]
    .map(folder => ({
      id: generateId(folder.uri.fsPath),
      ...folder,
    }));
}

export async function getWorkspaceResources(workspaceFolder: WorkspaceFolder) {
  const resourceFiles = await findYamlFiles(workspaceFolder.uri.fsPath);
  return convertFilesToK8sResources(resourceFiles);
}

export async function getWorkspaceLocalConfig(workspaceFolder: WorkspaceFolder) {
  const configPath = path.normalize(path.join(workspaceFolder.uri.fsPath, 'monokle.validation.yaml'));
  return readConfig(configPath);
}

export function initializeWorkspaceWatchers(workspaceFolders: WorkspaceFolder[], context: vscode.ExtensionContext) {
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
    const pattern = new vscode.RelativePattern(folder.uri.fsPath, '**/*.{yaml,yml}');
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    const revalidateFolder = async () => {
      console.log('revalidateFolder', folder);
      validateFolder(folder, context);
    };

    watcher.onDidChange((uri) => {
      console.log(`File ${uri.fsPath} has been changed`);
      revalidateFolder();
    });

    watcher.onDidCreate((uri) => {
      console.log(`File ${uri.fsPath} has been created`);
      revalidateFolder();
    });

    watcher.onDidDelete((uri) => {
      console.log(`File ${uri.fsPath} has been deleted`);
      revalidateFolder();
    });

    return watcher;
  });
}

async function findYamlFiles(folderPath: string): Promise<File[]> {
  const files = await fs.readdir(folderPath);

  return files
    .filter(file => path.extname(file) === '.yaml' || path.extname(file) === '.yml')
    .map(file => {
      const fullPath = path.normalize(path.join(folderPath, file));

      return {
        id: generateId(fullPath),
        name: file,
        path: fullPath
      };
    });
}

async function convertFilesToK8sResources(files: File[]): Promise<Resource[]> {
  const filesWithContent = await Promise.all(files.map(async file => {
    const content = await fs.readFile(file.path, 'utf-8');

    return {
      id: file.id,
      path: file.path,
      content
    };
  }));

  return extractK8sResources(filesWithContent);
}
