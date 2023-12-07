import { resolve } from 'path';
import { rm } from 'fs/promises';
import { extensions } from 'vscode';
import { STORAGE_DIR_NAME } from '../../constants';
import { Folder } from '../../utils/workspace';

export async function doSuiteSetup() {
  const extension = extensions.getExtension('kubeshop.monokle');

  if (!extension.isActive) {
    await extension.activate();
  }
}

export async function doSetup() {
  return clearStorageDir();
}

export async function doSuiteTeardown() {
  return clearStorageDir();
}

export async function runForFolders(folders: Folder[], fn: (folder: Folder) => Promise<void>) {
  return Promise.all(folders.map(async (folder) => {
    return fn(folder);
  }));
}

export async function runForFoldersInSequence(folders: Folder[], fn: (folder: Folder) => Promise<void>) {
  for (const folder of folders) {
    await fn(folder);
  }
}

async function clearStorageDir() {
  return rm(getStorageDir(), { recursive: true, force: true, maxRetries: 3 });
}

function getStorageDir() {
  return resolve(process.env.EXTENSION_DIR, STORAGE_DIR_NAME);
}
