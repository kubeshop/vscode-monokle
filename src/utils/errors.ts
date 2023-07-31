import { window } from 'vscode';
import { SETTINGS } from '../constants';
import globals from './globals';
import type { WorkspaceFolderConfig, Folder } from './workspace';

// Important: Notification promises resolves only after interaction with it (like closing),
// so in most cases we don't want to wait for it to not block rest of the flow.

export type ErrorAction = {
  title: string,
  callback: () => void | Promise<void>
};

export async function raiseInvalidConfigError(config: WorkspaceFolderConfig, owner: Folder) {
  let errorMsg: string;

  if (config.type === 'file') {
    errorMsg = `Your local configuration file, under '${config.path}' path, is invalid.`;
  }

  if (config.type === 'config') {
    errorMsg = `Your configuration file set with '${SETTINGS.CONFIGURATION_PATH_PATH}', under '${config.path}' path is invalid. ` +
      'Try using absolute path and make sure that the file exists.';
  }

  if (config.type === 'remote') {
    errorMsg = `Your remote configuration file from '${globals.remotePolicyUrl}' is invalid.`;
  }

  if (!errorMsg) {
    return null;
  }

  return raiseError(`${errorMsg} Resources in '${owner.name}' folder will not be validated.`);
}

export async function raiseCannotGetPolicyError(msg: string, actions?: ErrorAction[]) {
  return raiseError(`${msg} Remote policy cannot be fetched and resources will not be validated.`, actions);
}

export async function raiseError(msg: string, actions?: ErrorAction[]) {
  if (actions?.length) {
    return window.showErrorMessage(msg, {}, ...actions)
      .then(selectedAction => {
        if (!selectedAction?.callback) {
          return;
        }

        return selectedAction.callback();
      });
  }

  return window.showErrorMessage(msg);
}

export async function raiseWarning(msg: string, actions?: ErrorAction[]) {
  if (actions?.length) {
    return window.showErrorMessage(msg, {}, ...actions)
      .then(selectedAction => {
        if (!selectedAction?.callback) {
          return;
        }

        return selectedAction.callback();
      });
  }

  return window.showWarningMessage(msg);
}

export async function raiseInfo(msg: string, actions?: ErrorAction[]) {
  if (actions?.length) {
    return window.showInformationMessage(msg, {}, ...actions)
      .then(selectedAction => {
        if (!selectedAction?.callback) {
          return;
        }

        return selectedAction.callback();
      });
  }

  return window.showInformationMessage(msg);
}
