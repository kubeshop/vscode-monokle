import * as fs from 'fs/promises';
import * as path from 'path';

const VALIDATORS = new Map<string, {config: string, validator: any}>();

// IMPORTANT:
// MonokleValidator still handles reloading config nicely, so it's able to reconfigure itself.
// But having multiple roots, each with different config will make it inefficient to reconfigure
// validator multiple times for a single run.
// That's why we will have separate validator for each root.

export async function getValidator(validatorId: string, config?: any) {
  const validatorItem = VALIDATORS.get(validatorId);
  const validator = validatorItem?.validator ?? await getDefaultValidator();
  const oldConfig = validatorItem?.config ?? null;
  const newConfig = JSON.stringify(config);

  // TODO: this is already checked by monokle-core so we just can do "await validator.preload(newConfig);"
  // without diffing config
  // https://github.com/kubeshop/monokle-core/blob/5f04f1e2d8ddc4584ef71da76a683f03ca4580b6/packages/validation/src/MonokleValidator.ts#L158-L224
  if (oldConfig !== newConfig) {
    await validator.preload(config);

    VALIDATORS.set(validatorId, {
      config: newConfig,
      validator: validator,
    });
  }

  return validator;
}

export async function saveValidationResults(results: any, folderPath: string, fileName: string) {
  const resultsAsString = JSON.stringify(results);
  const filePath = path.normalize(path.join(folderPath, `${fileName}.monokle.json`));

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
