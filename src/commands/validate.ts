import { ExtensionContext, extensions } from 'vscode';
import { validateFolder } from '../utils/validation';
import { getWorkspaceFolders } from '../utils/workspace';

export function getValidateCommand(context: ExtensionContext) {
  return async () => {
    const sarifExtension = extensions.getExtension('MS-SarifVSCode.sarif-viewer');
    if (!sarifExtension.isActive) {
      await sarifExtension.activate();
    }

    const roots = getWorkspaceFolders();

    const resultFiles = await Promise.all(roots.map(async (root) => {
      return validateFolder(root, context);
    }));

    console.log(resultFiles);

    await sarifExtension.exports.openLogs(resultFiles);
  };
}
