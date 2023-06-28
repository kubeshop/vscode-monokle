import { ExtensionContext, extensions, Uri } from 'vscode';
import { getValidator, saveValidationResults } from "../utils/validation";
import { getWorkspaceFolders, getWorkspaceResources } from "../utils/workspace";

export function getValidateCommand(context: ExtensionContext) {
  return async () => {
    const roots = getWorkspaceFolders();
    const resources = (await Promise.all(roots.map((root) => getWorkspaceResources(root)))).flat();

    console.log(resources);

    const validator = await getValidator();

    console.log(validator);

    const results = await validator.validate({
      resources: resources,
    });

    console.log(results);

    const resultsFilePath = await saveValidationResults(results, context.extensionPath);

    console.log(resultsFilePath);

    const sarifExtension = extensions.getExtension('MS-SarifVSCode.sarif-viewer');
    if (!sarifExtension.isActive) {
      await sarifExtension.activate();
    }

    await sarifExtension.exports.openLogs([
      Uri.file(resultsFilePath),
    ]);
  };
}
