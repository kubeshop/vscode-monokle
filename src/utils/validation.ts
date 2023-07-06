import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, normalize } from 'path';
import { Uri } from 'vscode';
import { Document } from 'yaml';
import { getWorkspaceConfig, getWorkspaceResources } from './workspace';
import type { ExtensionContext } from 'vscode';
import type { Folder } from './workspace';

// Use default map with full list of plugins so it's easier
// for users to work with newly generated validation configuration file.
const DEFAULT_PLUGIN_MAP = {
  'open-policy-agent': true,
  'resource-links': true,
  'yaml-syntax': true,
  'kubernetes-schema': true,
  'pod-security-standards': false,
  'practices': false,
  'metadata': false,
};

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

export async function createTemporaryConfigFile(config: any, srcFolder: Folder, destPath: string) {
  const configDoc = new Document();
  configDoc.contents = config;
  configDoc.commentBefore = [
    ` The '${srcFolder.name}' folder uses default validation configuration. This file is readonly.`,
    ` You can adjust configuration by generating local configuration file with 'Monokle: Bootstrap configuration' command`,
    ` or by pointing to existing Monokle configuration file in 'monokle.configurationPath' setting.`
  ].join('\n');

  const fileName = `${srcFolder.id}.config.yaml`;
  const sharedStorageDir = normalize(join(destPath, '.monokle', fileName));
  const filePath = normalize(join(sharedStorageDir, fileName));

  await mkdir(sharedStorageDir, { recursive: true });

  await writeFile(filePath, configDoc.toString());

  return Uri.file(filePath);
}

export async function createDefaultConfigFile(destFolder: string) {
  const configDoc = new Document();
  configDoc.contents = {
    plugins: DEFAULT_PLUGIN_MAP,
  } as any;
  configDoc.commentBefore = [
    ' This is default validation configuration. You can adjust it freely to suit your needs.',
    ' You can read more about Monokle validation configuration here:',
    ' https://github.com/kubeshop/monokle-core/blob/main/packages/validation/docs/configuration.md#monokle-validation-configuration.',
  ].join('\n');

  const fileName = 'monokle.validation.yaml';
  const filePath = normalize(join(destFolder, fileName));

  await writeFile(filePath, configDoc.toString());

  return Uri.file(filePath);
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
