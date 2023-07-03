import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkspaceFolder, getWorkspaceLocalConfig, getWorkspaceResources } from './workspace';
import { ExtensionContext, Uri } from 'vscode';

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

export async function validateFolder(root: WorkspaceFolder, context: ExtensionContext) {
  const resources = await getWorkspaceResources(root);
  console.log('resources', resources);

  const workspaceLocalConfig = await getWorkspaceLocalConfig(root);
  console.log('workspaceLocalConfig', workspaceLocalConfig);

  const validator = await getValidator(root.id, workspaceLocalConfig);
  console.log('validator', validator);

  const result = await validator.validate({
    resources: resources,
  });
  console.log('result', result);

  const resultsFilePath = await saveValidationResults(result, context.extensionPath, root.id);
  console.log('resultsFilePath', resultsFilePath);

  return Uri.file(resultsFilePath);
}

export async function getValidationResult(folderPath: string, fileName: string) {
  const sharedStorageDir = path.normalize(path.join(folderPath, '.monokle'));
  const filePath = path.normalize(path.join(sharedStorageDir, `${fileName}.validation.json`));

  try {
    const resultsAsString = await fs.readFile(filePath, 'utf8');
    return JSON.parse(resultsAsString);
  } catch (e) {
    return null;
  }
}

export async function saveValidationResults(results: any, folderPath: string, fileName: string) {
  const sharedStorageDir = path.normalize(path.join(folderPath, '.monokle'));

  await fs.mkdir(sharedStorageDir, { recursive: true });

  const resultsAsString = JSON.stringify(results);
  const filePath = path.normalize(path.join(sharedStorageDir, `${fileName}.validation.json`));

  await fs.writeFile(filePath, resultsAsString);

  return filePath;
}

export async function readConfig(path: string) {
  const {readConfig} = await import('@monokle/validation');
  return readConfig(path);
}

async function getDefaultValidator() {
  const {createDefaultMonokleValidator} = await import('@monokle/validation');
  return createDefaultMonokleValidator();
}
