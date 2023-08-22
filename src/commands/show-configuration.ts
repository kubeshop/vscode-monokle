import { Uri, commands, window } from 'vscode';
import { canRun } from '../utils/commands';
import { getWorkspaceConfig, getWorkspaceFolders } from '../utils/workspace';
import { createTemporaryConfigFile } from '../utils/validation';
import { trackEvent } from '../utils/telemetry';
import type { Folder } from '../utils/workspace';

type FolderItem = {
  label: string;
  id: string;
};

export function getShowConfigurationCommand() {
  return async () => {
    if (!canRun()) {
      return null;
    }

    trackEvent('command/show_configuration', {
      status: 'started',
    });

    const folders = getWorkspaceFolders();

    if (!folders.length) {
      return null;
    }

    const showConfig = async (folder: Folder) => {
      const config = await getWorkspaceConfig(folder);
      const configUri = config.type !== 'default' ?
        Uri.file(config.path) :
        await createTemporaryConfigFile(config.config, config.owner);

      await commands.executeCommand('vscode.open', configUri);

      return config.type;
    };

    if (folders.length === 1) {
      const configType = await showConfig(folders[0]);

      trackEvent('command/show_configuration', {
        status: 'success',
        configurationType: configType,
      });

      return;
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

        const configType = await showConfig(selectedFolder);

        trackEvent('command/show_configuration', {
          status: 'success',
          configurationType: configType,
        });
      }
    });
    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();

    return null;
  };
}
