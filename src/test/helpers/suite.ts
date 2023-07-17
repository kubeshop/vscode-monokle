import { resolve } from 'path';
import { rm } from 'fs/promises';
import { extensions } from 'vscode';
import { STORAGE_DIR_NAME } from '../../constants';

export function getStorageDir() {
  return resolve(process.env.EXTENSION_DIR, STORAGE_DIR_NAME);
}

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

async function clearStorageDir() {
  return rm(getStorageDir(), { recursive: true, force: true });
}
