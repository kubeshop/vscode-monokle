import { validateFolder } from '../utils/validation';
import { getWorkspaceFolders } from '../utils/workspace';
import { canRun } from '../utils/commands';
import { trackEvent } from '../utils/telemetry';
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

    return context.sarifWatcher.replace(resultFiles);
  };
}
