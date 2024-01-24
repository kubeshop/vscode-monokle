import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join, normalize, relative } from 'path';
import { platform } from 'os';
import { Uri } from 'vscode';
import { Document } from 'yaml';
import { getWorkspaceConfig, WorkspaceFolderConfig } from './workspace';
import { VALIDATION_FILE_SUFFIX, DEFAULT_CONFIG_FILE_NAME, TMP_POLICY_FILE_SUFFIX } from '../constants';
import { getInvalidConfigError } from './errors';
import { trackEvent } from './telemetry';
import { getResultCache } from './result-cache';
import { getResourcesFromFolder } from './file-parser';
import { getSuppressions } from './suppressions';
import logger from '../utils/logger';
import globals from './globals';
import type { Folder } from './workspace';
import type { Resource } from './file-parser';

export type ConfigurableValidator = Awaited<ReturnType<typeof getValidatorInstance>>;
export type ValidationResponse = Awaited<ReturnType<ConfigurableValidator['validator']['validate']>>;
export type ValidationResult = ValidationResponse['runs'][0]['results'][0];

export type ConfigFileOptions = {
  commentBefore?: string;
};

// Use default map with full list of plugins so it's easier
// for users to work with newly generated validation configuration file.
const DEFAULT_PLUGIN_MAP = {
  'yaml-syntax': true,
  'resource-links': true,
  'kubernetes-schema': true,
  'pod-security-standards': true,
  'open-policy-agent': false,
  'practices': false,
  'metadata': false,
};

const DEFAULT_SETTINGS = {
  'kubernetes-schema': {
    schemaVersion: '1.28.2',
  }
};

// Having multiple roots, each with different config will make it inefficient to reconfigure
// validator multiple times for a single validation run. That's why we will need separate
// validator for each root (which will be reconfigured only when root related config changes).
const VALIDATORS = new Map<string, {config: string, validator: ConfigurableValidator}>();

// Store validation results for each root so those can bo compared.
const RESULTS = getResultCache<string, any>();

export async function getValidator(validatorId: string, config?: any) {
  const validatorItem = VALIDATORS.get(validatorId);
  const validatorObj = validatorItem?.validator ?? await getValidatorInstance();
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

  return validatorObj;
}

export async function validateFolder(root: Folder): Promise<Uri | null> {
  const resources = await getResourcesFromFolder(root.uri.fsPath);
  return validateResourcesFromFolder(resources, root);
}

export async function validateFolderWithDirtyFiles(root: Folder, dirtyResources: Resource[], dirtyFiles: readonly Uri[]): Promise<Uri | null> {
  const resources = await getResourcesFromFolder(root.uri.fsPath);
  const dirtyFilesPaths = dirtyFiles.map(file => file.toString());

  if (dirtyFilesPaths.length === 0) {
    return validateResourcesFromFolder(resources, root);
  }

  const unchangedResources = resources.filter(resource => {
    return !dirtyFilesPaths.includes(Uri.file(resource.filePath).toString());
  });
  return validateResourcesFromFolder([...unchangedResources, ...dirtyResources], root);
}

export async function validateResourcesFromFolder(resources: Resource[], root: Folder, incremental = false): Promise<Uri | null> {
  trackEvent('workspace/validate', {
    status: 'started',
  });

  if(!resources.length) {
    trackEvent('workspace/validate', {
      status: 'cancelled',
      resourceCount: 0,
    });

    return null;
  }

  const workspaceConfig = await getWorkspaceConfig(root);

  if (workspaceConfig.isValid === false) {
    if (workspaceConfig.type !== 'remote') {
      // For remote config, error is already send from policy puller.
      globals.setFolderStatus(root, getInvalidConfigError(workspaceConfig));
    }

    trackEvent('workspace/validate', {
      status: 'failure',
      resourceCount: resources.length,
      configurationType: workspaceConfig.type,
      isValidConfiguration: false,
      error: 'Invalid configuration',
    });

    return null;
  }

  const resourcesRelative = resources.map(resource => {
    return {
      ...resource,
      filePath: relative(root.uri.fsPath, resource.filePath),
    };
  });

  logger.log(root.name, 'workspaceConfig', workspaceConfig);

  const validatorObj = await getValidator(root.id, workspaceConfig.config);

  logger.log(root.name, 'validator', validatorObj.validator.config);
  logger.log(root, resources, resourcesRelative);

  let incrementalParam: {resourceIds: string[]} | undefined = undefined;
  if (incremental) {
    incrementalParam = {
      resourceIds: resourcesRelative.map(resource => resource.id)
    };
  }

  const suppressions = await getSuppressions(root.uri.fsPath);

  let result: ValidationResponse = null;
  try {
    if (suppressions?.suppressions?.length) {
      await validatorObj.fingerprintSuppressor.preload(suppressions.suppressions);
    }

    validatorObj.processRefs(resourcesRelative, incrementalParam);

    result = await validatorObj.validator.validate({
      resources: resourcesRelative,
      incremental: incrementalParam,
      srcroot: root.uri.toString(),
    });
  } catch (err: any) {
    logger.error('Validation failed', err);

    trackEvent('workspace/validate', {
      status: 'failure',
      resourceCount: resourcesRelative.length,
      configurationType: workspaceConfig.type,
      isValidConfiguration: workspaceConfig.isValid,
      error: err.message,
    });

    return null;
  }

  logger.log(root.name, 'result', result);

  result.runs.forEach(run => {
    run.results.forEach((result: any) => {
      const location = result.locations.find(location => location.physicalLocation?.artifactLocation?.uriBaseId === 'SRCROOT');

      if (location && location.physicalLocation.artifactLocation.uri) {
        location.physicalLocation.artifactLocation.uri = normalizePathForWindows(location.physicalLocation.artifactLocation.uri);
      }
    });
  });

  // This causes SARIF panel to reload so we want to write new results only when they are different.
  const resultUnchanged = await areValidationResultsSame(RESULTS.get(root.id), result);
  if (!resultUnchanged) {
    await saveValidationResults(result, root.id);
  }

  RESULTS.set(root.id, result);

  globals.setFolderStatus(root);

  const resultFilePath = await getValidationResultPath(root.id);

  logger.log(root.name, 'resultFilePath', resultFilePath, 'resultUnchanged', resultUnchanged);

  sendSuccessValidationTelemetry(resourcesRelative.length, workspaceConfig, result);

  return Uri.file(resultFilePath);
}

export async function getValidationResultForRoot(root: Folder) {
  return getValidationResult(root.id);
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
    ` or by pointing to existing Monokle configuration file in 'monokle.configurationPath' setting.`,
    ' ',
    ' You can also use remote config by navigating to Monokle Cloud (https://app.monokle.com)',
    ' and setting up new project with your repository and custom policy',
    ' as described in https://github.com/kubeshop/vscode-monokle#monokle-cloud-integration-setup).',
  ].join('\n');

  return saveConfig(config, globals.storagePath, `${ownerRoot.id}${TMP_POLICY_FILE_SUFFIX}`, {commentBefore});
}

export async function createDefaultConfigFile(ownerRootDir: string) {
  const config = {
    plugins: DEFAULT_PLUGIN_MAP,
    settings: DEFAULT_SETTINGS,
  };

  const commentBefore = [
    ' This is default validation configuration. You can adjust it freely to suit your needs.',
    ' You can read more about Monokle validation configuration here:',
    ' https://github.com/kubeshop/monokle-core/blob/main/packages/validation/docs/configuration.md#monokle-validation-configuration.',
    ' ',
    ' You can also use remote config by navigating to Monokle Cloud (https://app.monokle.com)',
    ' and setting up new project with your repository and custom policy',
    ' as described in https://github.com/kubeshop/vscode-monokle#monokle-cloud-integration-setup).',
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

export async function clearResourceCache(root: Folder, resourceIds: string[]) {
  const validatorItem = VALIDATORS.get(root.id);
  const parser = validatorItem?.validator?.parser;

  logger.log('clearResourceCache', !!parser, root.name, resourceIds);

  if (parser) {
      parser.clear(resourceIds);
  }
}

export async function readConfig(path: string) {
  const {readConfig} = await import('@monokle/validation');
  return readConfig(path);
}

export async function getDefaultConfig() {
  return (await getValidatorInstance()).validator.config;
}

async function getValidatorInstance() {
  const {MonokleValidator, ResourceParser, SchemaLoader, RemotePluginLoader, requireFromStringCustomPluginLoader, DisabledFixer, AnnotationSuppressor, FingerprintSuppressor, processRefs} = await import('@monokle/validation');
  const {fetchOriginConfig} = await import('@monokle/synchronizer');

  let originConfig = undefined;
  try {
    originConfig = await fetchOriginConfig(globals.origin);
  } catch (err) {
    logger.error('Failed to fetch origin config during validator creation', err);
  }

  const parser = new ResourceParser();
  const loader = new SchemaLoader(originConfig?.schemasOrigin || undefined);
  const fingerprintSuppressor = new FingerprintSuppressor();
  const validator = new MonokleValidator({
    loader: new RemotePluginLoader(requireFromStringCustomPluginLoader),
    parser,
    schemaLoader: loader,
    suppressors: [new AnnotationSuppressor(), fingerprintSuppressor],
    fixer: new DisabledFixer(),
  });

  await validator.preload({
    plugins: DEFAULT_PLUGIN_MAP,
    settings: DEFAULT_SETTINGS,
  });

  return {
    parser,
    loader,
    validator,
    fingerprintSuppressor,
    processRefs: (resources, incremental) => processRefs(resources, parser, incremental),
  };
}

function sendSuccessValidationTelemetry(resourceCount: number, workspaceConfig: WorkspaceFolderConfig, validationResult: any) {
  const results = validationResult?.runs?.length ? validationResult.runs[0].results : [];

  let errors = 0;
  let warnings = 0;
  results.forEach(result => {
    if (result.level === 'warning') {
      warnings++;
    } else if (result.level === 'error') {
      errors++;
    }
  });

  trackEvent('workspace/validate', {
    status: 'success',
    resourceCount,
    configurationType: workspaceConfig.type,
    isValidConfiguration: workspaceConfig.isValid,
    validationWarnings: warnings,
    validationErrors: errors,
  });
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

function areValidationResultsSame(previous: any, current: any) {
  if (!previous || !current) {
    return false;
  }

  return removeUniqueIds(JSON.stringify(previous)) === removeUniqueIds(JSON.stringify(current));
}

function removeUniqueIds(initialText: string) {
  let text = initialText;

  const guidRegexp = /"guid":\s*"([\d\w-]*)"/g;
  const matchesGuid = text.matchAll(guidRegexp);
  for (const match of matchesGuid) {
    text = text.replace(match[1], '');
  }

  const hashRegexp = /"monokleHash\/v1":\s*"([\d\w-]*)"/g;
  const matchesHash = text.matchAll(hashRegexp);
  for (const match of matchesHash) {
    text = text.replace(match[1], '');
  }

  return text;
}
