import * as fs from 'fs/promises';
import * as path from 'path';

export async function getValidator() {
  const {createDefaultMonokleValidator} = await import('@monokle/validation');
  return createDefaultMonokleValidator();
}

export async function saveValidationResults(results: any, folderPath: string) {
  const resultsAsString = JSON.stringify(results);
  const filePath = path.normalize(path.join(folderPath, 'monokle-results.json'));

  await fs.writeFile(filePath, resultsAsString);

  return filePath;
}
