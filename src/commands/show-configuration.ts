import { Uri, commands } from 'vscode';
import { canRun } from '../utils/commands';
import { getWorkspaceConfig, getWorkspaceFolders } from '../utils/workspace';
import { createTemporaryConfigFile } from '../utils/validation';
import type { RuntimeContext } from '../utils/runtime-context';

export function getShowConfigurationCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return null;
    }

    const folders = getWorkspaceFolders();

    if (!folders.length) {
      return null;
    }

    const configs = await Promise.all(folders.map(async (folder) => await getWorkspaceConfig(folder)));

    for (const config of configs) {
      const configUri = config.type === 'file' || config.type === 'config' ?
        Uri.file(config.path) :
        await createTemporaryConfigFile(config.config, config.owner, context.extensionContext.extensionPath);

      await commands.executeCommand('vscode.open', configUri);
    }
  };
}
