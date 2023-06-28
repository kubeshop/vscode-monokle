import { ExtensionContext, extensions, Uri } from 'vscode';
import { getValidator, saveValidationResults } from "../utils/validation";
import { getWorkspaceFolders, getWorkspaceResources } from "../utils/workspace";

export function getValidateCommand(context: ExtensionContext) {
  // validator per root
  // result file per root
  // when revalidating, pick the right validator and validate with incremental results

  return async () => {
    const sarifExtension = extensions.getExtension('MS-SarifVSCode.sarif-viewer');
    if (!sarifExtension.isActive) {
      await sarifExtension.activate();
    }

    const roots = getWorkspaceFolders();

    const resultFiles = await Promise.all(roots.map(async (root) => {
      const resources = await getWorkspaceResources(root);
      console.log(resources);

      //TODO read ws monookle.config and pass to getValidator

      const validator = await getValidator(root.id);
      console.log(validator);

      const result = await validator.validate({
        resources: resources,
      });
      console.log(result);

      const resultsFilePath = await saveValidationResults(result, context.extensionPath, root.id);
      console.log(resultsFilePath);

      return Uri.file(resultsFilePath);
    }));

    console.log(resultFiles);

    await sarifExtension.exports.openLogs(resultFiles);
  };
}
