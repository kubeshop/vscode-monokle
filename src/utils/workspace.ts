import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

import { Resource, extractK8sResources } from './extract';

type File = {
  id: string;
  name: string;
  path: string;
};

export function getWorkspaceFolders(): (vscode.WorkspaceFolder & {id: string})[] {
  return [...(vscode.workspace.workspaceFolders ?? [])]
    .map(folder => ({
      id: crypto.createHash('md5').update(folder.uri.fsPath).digest('hex'),
      ...folder,
    }));
}

export async function getWorkspaceResources(workspace: vscode.WorkspaceFolder) {
  const resourceFiles = await findYamlFiles(workspace.uri.fsPath);
  return convertFilesToK8sResources(resourceFiles);
}

// TODO
export function initializeWatcher(folderPath: string) {
  const pattern = new vscode.RelativePattern(folderPath, '**/*.yaml');
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);

  watcher.onDidChange((uri) => {
    console.log(`File ${uri.fsPath} has been changed`);
    // Do something when a .yaml file has been changed
  });

  watcher.onDidCreate((uri) => {
    console.log(`File ${uri.fsPath} has been created`);
    // Do something when a .yaml file has been created
  });

  watcher.onDidDelete((uri) => {
    console.log(`File ${uri.fsPath} has been deleted`);
    // Do something when a .yaml file has been deleted
  });

  return watcher;
}

async function findYamlFiles(folderPath: string): Promise<File[]> {
  const files = await fs.readdir(folderPath);

  return files
    .filter(file => path.extname(file) === '.yaml' || path.extname(file) === '.yml')
    .map(file => {
      const fullPath = path.normalize(path.join(folderPath, file));

      return {
        id: crypto.createHash('md5').update(fullPath).digest('hex'),
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
