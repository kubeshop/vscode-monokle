import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, normalize } from 'path';
import { getWorkspaceConfig, getWorkspaceResources } from './workspace';
import { Uri } from 'vscode';
import type { ExtensionContext } from 'vscode';
import type { Folder } from './workspace';

// Having multiple roots, each with different config will make it inefficient to reconfigure
// validator multiple times for a single validation run. That's why we will need separate
// validator for each root (which will be reconfigured only when root related config changes).
const VALIDATORS = new Map<string, {config: string, validator: any}>();

export async function getValidator(validatorId: string, config?: any) {
  const validatorItem = VALIDATORS.get(validatorId);
  const validator = validatorItem?.validator ?? await getDefaultValidator();
  const oldConfig = validatorItem?.config ?? null;
  const newConfig = JSON.stringify(config);

  // Reconfigure validator only if config has changed.
  if (oldConfig !== newConfig) {
    await validator.preload(config);
  }

  VALIDATORS.set(validatorId, {
    config: newConfig,
    validator: validator,
  });

  return validator;
}

export async function validateFolder(root: Folder, context: ExtensionContext) {
  const resources = await getWorkspaceResources(root);
  console.log(root.name, 'resources', resources);

  if(!resources.length) {
    return null;
  }

  const workspaceConfig = await getWorkspaceConfig(root);
  console.log(root.name, 'workspaceConfig', workspaceConfig);

  const validator = await getValidator(root.id, workspaceConfig.config);
  console.log(root.name, 'validator', validator);

  const result = await validator.validate({
    resources: resources,
  });
  console.log(root.name, 'result', result);

  const resultsFilePath = await saveValidationResults(result, context.extensionPath, root.id);
  console.log(root.name, 'resultsFilePath', resultsFilePath);

  return Uri.file(resultsFilePath);
}

export async function getValidationResult(folderPath: string, fileName: string) {
  const sharedStorageDir = normalize(join(folderPath, '.monokle'));
  const filePath = normalize(join(sharedStorageDir, `${fileName}.validation.json`));

  try {
    const resultsAsString = await readFile(filePath, 'utf8');
    return JSON.parse(resultsAsString);
  } catch (e) {
    return null;
  }
}

export async function saveValidationResults(results: any, folderPath: string, fileName: string) {
  const sharedStorageDir = normalize(join(folderPath, '.monokle'));

  await mkdir(sharedStorageDir, { recursive: true });

  const resultsAsString = JSON.stringify(results);
  const filePath = normalize(join(sharedStorageDir, `${fileName}.validation.json`));

  await writeFile(filePath, resultsAsString);

  return filePath;
}

export function getValidationResultPath(folderPath: string, fileName: string) {
  return normalize(join(folderPath, '.monokle', `${fileName}.validation.json`));
}

export async function readConfig(path: string) {
  const {readConfig} = await import('@monokle/validation');
  return readConfig(path);
}

export async function getDefaultConfig(root: Folder) {
  const validatorItem = VALIDATORS.get(root.id);
  const validator = validatorItem?.validator ?? await getDefaultValidator();

  return validator.config;
}

async function getDefaultValidator() {
  const {createDefaultMonokleValidator} = await import('@monokle/validation');
  return createDefaultMonokleValidator();
}
