import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join, normalize } from 'path';
import { platform } from 'os';
import { Uri } from 'vscode';
import { Document } from 'yaml';
import { getWorkspaceConfig, getWorkspaceResources } from './workspace';
import { VALIDATION_FILE_SUFFIX, DEFAULT_CONFIG_FILE_NAME, TMP_POLICY_FILE_SUFFIX } from '../constants';
import { raiseInvalidConfigError } from './errors';
import logger from '../utils/logger';
import globals from './globals';
import type { Folder } from './workspace';

export type ConfigurableValidator = {
  parser: any;
  loader: any;
  validator: any;
};

export type ConfigFileOptions = {
  commentBefore?: string;
};

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
const VALIDATORS = new Map<string, {config: string, validator: ConfigurableValidator}>();

export async function getValidator(validatorId: string, config?: any) {
  const validatorItem = VALIDATORS.get(validatorId);
  const validatorObj = validatorItem?.validator ?? await getConfigurableValidator();
  const validator = validatorObj.validator;
  const oldConfig = validatorItem?.config ?? null;
  const newConfig = JSON.stringify(config);

  // Reconfigure validator only if config has changed.
  if (oldConfig !== newConfig) {
    await validator.preload(config);
  }

  VALIDATORS.set(validatorId, {
    config: newConfig,
    validator: validatorObj,
  });

  return validator;
}

export async function validateFolder(root: Folder): Promise<Uri | null> {
  const resources = await getWorkspaceResources(root);

  if(!resources.length) {
    return null;
  }

  const workspaceConfig = await getWorkspaceConfig(root);

  if (workspaceConfig.isValid === false) {
    if (workspaceConfig.type === 'remote') {
      return null; // Error will be already shown by policy puller.
    }

    raiseInvalidConfigError(workspaceConfig, root);
    return null;
  }

  logger.log(root.name, 'workspaceConfig', workspaceConfig);

  const validator = await getValidator(root.id, workspaceConfig.config);

  logger.log(root.name, 'validator', validator);

  const result = await validator.validate({
    resources: resources,
  });

  logger.log(root.name, 'result', result);

  result.runs.forEach(run => {
    run.results.forEach((result: any) => {
      const location = result.locations.find(location => location.physicalLocation?.artifactLocation?.uriBaseId === 'SRCROOT');

      if (location && location.physicalLocation.artifactLocation.uri) {
        location.physicalLocation.artifactLocation.uri = normalizePathForWindows(location.physicalLocation.artifactLocation.uri);
      }
    });
  });

  const resultsFilePath = await saveValidationResults(result, root.id);

  logger.log(root.name, 'resultsFilePath', resultsFilePath);

  return Uri.file(resultsFilePath);
}

export async function getValidationResult(fileName: string) {
  const filePath = getValidationResultPath(fileName);

  try {
    const resultsAsString = await readFile(filePath, 'utf8');
    return JSON.parse(resultsAsString);
  } catch (e) {
    return null;
  }
}

export async function saveValidationResults(results: any, fileName: string) {
  await mkdir(globals.storagePath, { recursive: true });

  const resultsAsString = JSON.stringify(results);
  const filePath = getValidationResultPath(fileName);

  await writeFile(filePath, resultsAsString);

  return filePath;
}

export function getValidationResultPath(fileName: string) {
  return normalize(join(globals.storagePath, `${fileName}${VALIDATION_FILE_SUFFIX}`));
}

export async function createTemporaryConfigFile(config: any, ownerRoot: Folder) {
  const commentBefore = [
    ` The '${ownerRoot.name}' folder uses default validation configuration. This file is readonly.`,
    ` You can adjust configuration by generating local configuration file with 'Monokle: Bootstrap configuration' command`,
    ` or by pointing to existing Monokle configuration file in 'monokle.configurationPath' setting.`
  ].join('\n');

  return saveConfig(config, globals.storagePath, `${ownerRoot.id}${TMP_POLICY_FILE_SUFFIX}`, {commentBefore});
}

export async function createDefaultConfigFile(ownerRootDir: string) {
  const config = {
    plugins: DEFAULT_PLUGIN_MAP,
  };

  const commentBefore = [
    ' This is default validation configuration. You can adjust it freely to suit your needs.',
    ' You can read more about Monokle validation configuration here:',
    ' https://github.com/kubeshop/monokle-core/blob/main/packages/validation/docs/configuration.md#monokle-validation-configuration.',
  ].join('\n');

  return saveConfig(config, ownerRootDir, DEFAULT_CONFIG_FILE_NAME, {commentBefore});
}

export async function saveConfig(config: any, path: string, fileName: string, options?: ConfigFileOptions) {
  const configDoc = new Document();
  configDoc.contents = config;

  if (options?.commentBefore) {
    configDoc.commentBefore = options.commentBefore;
  }

  const dir = normalize(path);
  const filePath = normalize(join(dir, fileName));

  await mkdir(dir, { recursive: true });

  await writeFile(filePath, configDoc.toString());

  return Uri.file(filePath);
}

export async function removeConfig(path: string, fileName: string) {
  try {
    const dir = normalize(path);
    const filePath = normalize(join(dir, fileName));

    await unlink(filePath);

    return true;
  } catch (err) {
    return false;
  }
}

export async function clearResourceCache(root: Folder, resourceId: string) {
  const validatorItem = VALIDATORS.get(root.id);
  const parser = validatorItem?.validator?.parser;

  logger.log('clearResourceCache', !!parser, root.name, resourceId);

  if (parser) {
      parser.clear([resourceId]);
  }
}

export async function readConfig(path: string) {
  const {readConfig} = await import('@monokle/validation');
  return readConfig(path);
}

export async function getDefaultConfig() {
  return (await getDefaultValidator()).config;
}

async function getDefaultValidator() {
  const {createDefaultMonokleValidator} = await import('@monokle/validation');
  return createDefaultMonokleValidator();
}

async function getConfigurableValidator() {
  const {ResourceParser, SchemaLoader, createExtensibleMonokleValidator} = await import('@monokle/validation');
  const parser = new ResourceParser();
  const schemaLoader = new SchemaLoader();

  return {
    parser,
    loader: schemaLoader,
    validator: createExtensibleMonokleValidator(parser, schemaLoader),
  };
}

// For some reason (according to specs? to be checked) SARIF extension doesn't like
// valid Windows paths, which are "C:\path\to\file.yaml". It expects them to have
// unix like separators, so "C:/path/to/file.yaml".
function normalizePathForWindows(path: string) {
  if (platform() === 'win32') {
    return path.replace(/\\/g, '/');
  }

  return path;
}
