import { window } from 'vscode';
import { canRun } from '../utils/commands';
import { COMMANDS } from '../constants';
import globals from '../utils/globals';
import type { RuntimeContext } from '../utils/runtime-context';

export function getSynchronizeCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return null;
    }

    if (!globals.user.isAuthenticated) {
      window.showWarningMessage(`You are not authenticated, cannot synchronize policies. Run ${COMMANDS.LOGIN} to authenticate first.}`);
      return null;
    }

    return await context.policyPuller.refresh();
  };
}