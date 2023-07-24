import { window } from 'vscode';
import { canRun } from '../utils/commands';
import { SETTINGS } from '../constants';
import globals from '../utils/globals';
import type { RuntimeContext } from '../utils/runtime-context';

export function getDownloadPolicyCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return null;
    }

    if (!globals.remotePolicyUrl) {
      window.showWarningMessage(`The '${SETTINGS.REMOTE_POLICY_URL_PATH}' configuration option is not set, cannot download remote policy.`);
      return null;
    }

    return await context.policyPuller.refresh();
  };
}