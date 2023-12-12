import { Uri, workspace } from 'vscode';
import { getValidationResultPath, validateFolder } from '../utils/validation';
import { getWorkspaceFolders } from '../utils/workspace';
import { canRun } from '../utils/commands';
import { trackEvent } from '../utils/telemetry';
import logger from '../utils/logger';
import type { RuntimeContext } from '../utils/runtime-context';

export function getValidateCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return;
    }

    trackEvent('command/validate', {
      status: 'started',
    });

    context.isValidating = true;

    const roots = getWorkspaceFolders();

    const resultFiles = (await Promise.all(roots.map(async (root) => {
      return validateFolder(root);
    }))).filter(Boolean);

    context.isValidating = false;

    trackEvent('command/validate', {
      status: 'success',
      rootCount: roots.length,
    });

    // Always use all existing result files for active workspaces.
    const validResultFiles = (await Promise.all(roots.map(async (root) => {
      const resultFile = Uri.file(getValidationResultPath(root.id));
      try {
        await workspace.fs.stat(resultFile);
        return resultFile;
      } catch (err: any) {
        logger.warn(`No SARIF result file for ${root.id} in ${resultFile.fsPath}`, err);
        return null;
      }
    }))).filter(Boolean);

    logger.log('Validate results - by workspace; from validateFn:', validResultFiles, resultFiles);

    return context.sarifWatcher.replace(validResultFiles);
  };
}
