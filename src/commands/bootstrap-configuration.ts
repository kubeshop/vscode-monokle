import { Uri, commands, window } from 'vscode';
import { canRun } from '../utils/commands';
import { getWorkspaceConfig, getWorkspaceFolders } from '../utils/workspace';
import { createDefaultConfigFile } from '../utils/validation';
import { raiseInfo, raiseWarning } from '../utils/errors';
import { trackEvent } from '../utils/telemetry';
import logger from '../utils/logger';
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

    trackEvent('command/bootstrap_configuration', {
      status: 'started',
    });

    const folders = getWorkspaceFolders();

    if (!folders.length) {
      return null;
    }

    const generateConfig = async (folder: Folder) => {
      logger.log('Generating config for folder', folder);

      const currentConfig = await getWorkspaceConfig(folder);
      if (currentConfig.type === 'file') {
        raiseInfo(`Local '${currentConfig.fileName}' configuration file already exists, opening it.`);
        return {
          path: currentConfig.path,
          type: currentConfig.type,
        };
      }

      if (currentConfig.type === 'config') {
        raiseWarning(`Shared '${currentConfig.path}' configuration file already exists, opening it.`);
        return {
          path: currentConfig.path,
          type: currentConfig.type,
        };
      }

      if (currentConfig.type === 'remote') {
        raiseWarning(`Remote '${currentConfig.fileName}' configuration file already exists, opening it.`);
        return {
          path: currentConfig.path,
          type: currentConfig.type,
        };
      }

      const configPath = (await createDefaultConfigFile(folder.uri.fsPath)).fsPath;

      return {
        path: configPath,
        type: 'default',
      };
    };

    if (folders.length === 1) {
      const configData = await generateConfig(folders[0]);
      await commands.executeCommand('vscode.open', Uri.file(configData.path));

      trackEvent('command/bootstrap_configuration', {
        status: 'success',
        configurationType: configData.type,
      });

      return null;
    }

    const quickPick = window.createQuickPick<FolderItem>();

    quickPick.items = folders.map(folder => ({ label: folder.name, id: folder.id }));
    quickPick.onDidChangeSelection(async (selection) => {
      if (selection.length > 0) {
        const selectedFolder = folders.find(folder => folder.id === selection[0].id);

        if (!selectedFolder) {
          // error
        }

        const configData = await generateConfig(selectedFolder);

        quickPick.hide();

        await commands.executeCommand('vscode.open', Uri.file(configData.path));

        trackEvent('command/bootstrap_configuration', {
          status: 'success',
          configurationType: configData.type,
        });
      }
    });

    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();

    return null;
  };
}
