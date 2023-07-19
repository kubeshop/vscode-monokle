import { window } from 'vscode';
import { SETTINGS } from '../constants';
import globals from './globals';
import type { WorkspaceFolderConfig, Folder } from './workspace';

// Important: Notification promises resolves only after interaction with it (like closing),
// so in most cases we don't want to wait for it to not block rest of the flow.

export async function raiseInvalidConfigError(config: WorkspaceFolderConfig, owner: Folder) {
  let errorMsg: string;

  if (config.type === 'file') {
    errorMsg = `Your local configuration file, under '${config.path}' path, is invalid.`;
  }

  if (config.type === 'config') {
    errorMsg = `Your configuration file set with '${SETTINGS.CONFIGURATION_PATH_PATH}', under '${config.path}' path is invalid, ` +
      'try using absolute path and make sure that the file exists.';
  }

  if (config.type === 'remote') {
    errorMsg = `Your remote configuration file from '${globals.remotePolicyUrl}' is invalid.`;
  }

  if (!errorMsg) {
    return null;
  }

  return raiseError(`${errorMsg} Resources in '${owner.name}' folder will not be validated.`);
}

export async function raiseError(msg: string) {
  return window.showErrorMessage(msg);
}

export async function raiseWarning(msg: string) {
  return window.showWarningMessage(msg);
}
