import { ok } from 'assert';
import { CodeAction, Uri, Range, commands } from 'vscode';
import { getValidationResult } from '../../utils/validation';
import type { Folder } from '../../utils/workspace';
import logger from '../../utils/logger';

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


export async function waitForCodeActionList(uri: Uri, range: Range, expectedMinActions?: number, timeoutMs?: number,): Promise<CodeAction[]> {

  if(timeoutMs && timeoutMs > 0) {
    try {
      const start = Date.now();
      const codeActions = await commands.executeCommand<CodeAction[]>('vscode.executeCodeActionProvider', uri, range);
      if(!!codeActions?.length && codeActions.length >= expectedMinActions) {
        return codeActions;
      }
      const end = Date.now();
      return waitForCodeActionList(uri, range, expectedMinActions, timeoutMs - (end - start));
    } catch (error) {
      logger.error(error.message, {uri, range}, error);
    }

  }

  return [];
}
