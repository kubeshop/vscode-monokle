import { Uri, commands, window } from 'vscode';
import { canRun } from '../utils/commands';
import { getWorkspaceConfig, getWorkspaceFolders } from '../utils/workspace';
import { createDefaultConfigFile } from '../utils/validation';
import type { Folder } from '../utils/workspace';

type FolderItem = {
  label: string;
  id: string;
};

export function getBootstrapConfigurationCommand() {
  return async () => {
    if (!canRun()) {
      return null;
    }

    const folders = getWorkspaceFolders();

    if (!folders.length) {
      return null;
    }

    const generateConfig = async (folder: Folder) => {
      console.log('Generating config for folder', folder);

      const currentConfig = await getWorkspaceConfig(folder);
      if (currentConfig.type === 'file') {
        window.showInformationMessage(`Local '${currentConfig.fileName}' configuration file already exists, opening it.`);
        return currentConfig.path;
      }

      if (currentConfig.type === 'config') {
        window.showWarningMessage(`Shared '${currentConfig.path}' configuration file already exists, opening it.`);
        return currentConfig.path;
      }

      const configPath = (await createDefaultConfigFile(folder.uri.fsPath)).fsPath;

      return configPath;
    };

    if (folders.length === 1) {
      const configPath = await generateConfig(folders[0]);
      return await commands.executeCommand('vscode.open', Uri.file(configPath));
    }

    const quickPick = window.createQuickPick<FolderItem>();

    quickPick.items = folders.map(folder => ({ label: folder.name, id: folder.id }));
    quickPick.onDidChangeSelection(async (selection) => {
      if (selection.length > 0) {
        const selectedFolder = folders.find(folder => folder.id === selection[0].id);

        if (!selectedFolder) {
          // error
        }

        const configPath = await generateConfig(selectedFolder);

        quickPick.hide();

        await commands.executeCommand('vscode.open', Uri.file(configPath));
      }
    });
    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();

    return null;
  };
}
