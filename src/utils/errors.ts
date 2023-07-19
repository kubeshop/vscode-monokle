import { window } from 'vscode';
import { SETTINGS } from '../constants';
import globals from './globals';
import type { WorkspaceFolderConfig, Folder } from './workspace';

export async function raiseInvalidConfigError(config: WorkspaceFolderConfig, owner: Folder) {
  let errorMsg: string;

  if (config.type === 'file') {
    errorMsg = `Your local configuration file, under '${config.path}' path, is invalid.`;
  }

  if (config.type === 'config') {
    errorMsg = `Your configuration file set with ${SETTINGS.CONFIGURATION_PATH_PATH}, under '${config.path}' path is invalid, ` +
      'try using absolute path and make sure that the file exists.';
  }

  if (config.type === 'remote') {
    errorMsg = `Your remote configuration file from ${globals.remotePolicyUrl} is invalid.`;
  }

  if (!errorMsg) {
    return null;
  }

  return window.showErrorMessage(`${errorMsg} Resources in '${owner.name}' folder will not be validated.`);
}
