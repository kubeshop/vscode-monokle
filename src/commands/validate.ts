import { validateFolder } from '../utils/validation';
import { getWorkspaceFolders } from '../utils/workspace';
import { SarifWatcher } from '../utils/sarif';
import { canRun } from '../utils/commands';
import type { ExtensionContext } from 'vscode';

export function getValidateCommand(context: ExtensionContext, sarifWatcher: SarifWatcher) {
  return async () => {
    if (!canRun()) {
      return;
    }

    const roots = getWorkspaceFolders();

    const resultFiles = (await Promise.all(roots.map(async (root) => {
      return validateFolder(root, context);
    }))).filter(Boolean);

    return sarifWatcher.replace(resultFiles);
  };
}
