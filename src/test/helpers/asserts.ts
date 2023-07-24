import { ok } from 'assert';
import { getValidationResult } from '../../utils/validation';
import type { Folder } from '../../utils/workspace';

export async function assertEmptyValidationResults(workspaceFolder: Folder): Promise<void> {
  const result = await getValidationResult(workspaceFolder.id);

  ok(result === null);
}

export function assertValidationResults(result) {
  ok(result);
  ok(result?.runs);
  ok(result.runs[0].tool);
  ok(result.runs[0].results);
  ok(result.runs[0].taxonomies);
}

export async function waitForValidationResults(workspaceFolder: Folder, timeoutMs?: number): Promise<any> {
  return new Promise((res) => {
    let timeoutId = null;

    const intervalId = setInterval(async () => {
      const result = await getValidationResult(workspaceFolder.id);

      if (result) {
        clearInterval(intervalId);
        timeoutId && clearTimeout(timeoutId);
        res(result);
      }
    }, 250);

    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        res(null);
      }, timeoutMs);
    }
  });
}
