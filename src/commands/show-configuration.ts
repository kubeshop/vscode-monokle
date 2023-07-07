import { Uri, commands, window } from 'vscode';
import { canRun } from '../utils/commands';
import { getWorkspaceConfig, getWorkspaceFolders } from '../utils/workspace';
import { createTemporaryConfigFile } from '../utils/validation';
import type { RuntimeContext } from '../utils/runtime-context';
import type { Folder } from '../utils/workspace';

type FolderItem = {
  label: string;
  id: string;
};

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

    const showConfig = async (folder: Folder) => {
      const config = configs.find(config => config.owner.id === folder.id);
      const configUri = config.type === 'file' || config.type === 'config' ?
        Uri.file(config.path) :
        await createTemporaryConfigFile(config.config, config.owner, context.extensionContext.extensionPath);

      return commands.executeCommand('vscode.open', configUri);
    };

    if (folders.length === 1) {
      return await showConfig(folders[0]);
    }

    const quickPick = window.createQuickPick<FolderItem>();

    quickPick.items = folders.map(folder => ({ label: folder.name, id: folder.id }));
    quickPick.onDidChangeSelection(async (selection) => {
      if (selection.length > 0) {
        const selectedFolder = folders.find(folder => folder.id === selection[0].id);

        if (!selectedFolder) {
          // error
        }

        quickPick.hide();

        await showConfig(selectedFolder);
      }
    });
    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();

    return null;
  };
}