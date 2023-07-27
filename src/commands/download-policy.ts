import { window } from 'vscode';
import { canRun } from '../utils/commands';
import { COMMANDS } from '../constants';
import globals from '../utils/globals';
import type { RuntimeContext } from '../utils/runtime-context';

export function getDownloadPolicyCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return null;
    }

    if (!globals.isAuthenticated) {
      window.showWarningMessage(`You are not authenticated, cannot download remote policy. Run ${COMMANDS.LOGIN} to authenticate first.}`);
      return null;
    }

    return await context.policyPuller.refresh();
  };
}