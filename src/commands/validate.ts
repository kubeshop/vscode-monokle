import * as vscode from 'vscode';
import { ExtensionContext, extensions } from 'vscode';
import { validateFolder } from '../utils/validation';
import { getWorkspaceFolders } from '../utils/workspace';

export function getValidateCommand(context: ExtensionContext) {
  return async () => {
    const isEnabled = vscode.workspace.getConfiguration('monokle').get('enabled');
    if (!isEnabled) {
      vscode.window.showInformationMessage('Monokle is disabled for this workspace. Enable it in the settings.');
      return;
    }

    const sarifExtension = extensions.getExtension('MS-SarifVSCode.sarif-viewer');
    if (!sarifExtension.isActive) {
      await sarifExtension.activate();
    }

    const roots = getWorkspaceFolders();

    const resultFiles = await Promise.all(roots.map(async (root) => {
      return validateFolder(root, context);
    }));

    // @TODO store workspace config - .monokle/id.config.yaml

    console.log(resultFiles);

    await sarifExtension.exports.openLogs(resultFiles);
  };
}
