import { validateFolder } from '../utils/validation';
import { getWorkspaceFolders } from '../utils/workspace';
import { canRun } from '../utils/commands';
import type { RuntimeContext } from '../utils/runtime-context';

export function getValidateCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return;
    }

    context.isValidating = true;

    const roots = getWorkspaceFolders();

    const resultFiles = (await Promise.all(roots.map(async (root) => {
      return validateFolder(root, context.extensionContext);
    }))).filter(Boolean);

    context.isValidating = false;

    return context.sarifWatcher.replace(resultFiles);
  };
}
