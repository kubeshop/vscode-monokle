import { MessageOptions, window } from 'vscode';
import { SETTINGS } from '../constants';
import globals from './globals';
import type { WorkspaceFolderConfig } from './workspace';

// Important: Notification promises resolves only after interaction with it (like closing),
// so in most cases we don't want to wait for it to not block rest of the flow.

export type ErrorAction = {
  title: string,
  callback: () => void | Promise<void>
};

export function getInvalidConfigError(config: WorkspaceFolderConfig) {
  let errorMsg = '';

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

  return errorMsg;
}

export async function raiseError(msg: string, actions: ErrorAction[] = [], options: MessageOptions = {}) {
  if (actions?.length) {
    return window.showErrorMessage(msg, options, ...actions)
      .then(selectedAction => {
        if (!selectedAction?.callback) {
          return;
        }

        return selectedAction.callback();
      });
  }

  return window.showErrorMessage(msg, options);
}

export async function raiseWarning(msg: string, actions: ErrorAction[] = [], options: MessageOptions = {}) {
  if (actions?.length) {
    return window.showErrorMessage(msg, options, ...actions)
      .then(selectedAction => {
        if (!selectedAction?.callback) {
          return;
        }

        return selectedAction.callback();
      });
  }

  return window.showWarningMessage(msg, options);
}

export async function raiseInfo(msg: string, actions: ErrorAction[] = [], options: MessageOptions = {}) {
  if (actions?.length) {
    return window.showInformationMessage(msg, options, ...actions)
      .then(selectedAction => {
        if (!selectedAction?.callback) {
          return;
        }

        return selectedAction.callback();
      });
  }

  return window.showInformationMessage(msg, options);
}
