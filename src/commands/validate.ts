import { ExtensionContext, extensions, Uri } from 'vscode';
import { getValidator, saveValidationResults } from "../utils/validation";
import { getWorkspaceFolders, getWorkspaceLocalConfig, getWorkspaceResources } from "../utils/workspace";

export function getValidateCommand(context: ExtensionContext) {
  return async () => {
    const sarifExtension = extensions.getExtension('MS-SarifVSCode.sarif-viewer');
    if (!sarifExtension.isActive) {
      await sarifExtension.activate();
    }

    const roots = getWorkspaceFolders();

    const resultFiles = await Promise.all(roots.map(async (root) => {
      const resources = await getWorkspaceResources(root);
      console.log('resources', resources);

      const workspaceLocalConfig = await getWorkspaceLocalConfig(root);
      console.log('workspaceLocalConfig', workspaceLocalConfig);

      const validator = await getValidator(root.id, workspaceLocalConfig);
      console.log('validator', validator);

      const result = await validator.validate({
        resources: resources,
      });
      console.log('result', result);

      const resultsFilePath = await saveValidationResults(result, context.extensionPath, root.id);
      console.log('resultsFilePath', resultsFilePath);

      return Uri.file(resultsFilePath);
    }));

    console.log(resultFiles);

    await sarifExtension.exports.openLogs(resultFiles);
  };
}
