import { workspace, window } from 'vscode';
import { validateFolder } from '../utils/validation';
import { getWorkspaceFolders } from '../utils/workspace';
import { SarifWatcher } from '../utils/sarif';
import type { ExtensionContext } from 'vscode';

export function getValidateCommand(context: ExtensionContext, sarifWatcher: SarifWatcher) {
  return async () => {
    const isEnabled = workspace.getConfiguration('monokle').get('enabled');
    if (!isEnabled) {
      window.showInformationMessage('Monokle is disabled for this workspace. Enable it in the settings.');
      return;
    }

    const roots = getWorkspaceFolders();

    const resultFiles = (await Promise.all(roots.map(async (root) => {
      return validateFolder(root, context);
    }))).filter(Boolean);

    return sarifWatcher.replace(resultFiles);
  };
}
