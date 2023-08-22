import { commands } from 'vscode';
import { canRun } from '../utils/commands';
import { COMMANDS, COMMAND_NAMES } from '../constants';
import { raiseWarning } from '../utils/errors';
import globals from '../utils/globals';
import type { RuntimeContext } from '../utils/runtime-context';

export function getSynchronizeCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return null;
    }

    if (!globals.user.isAuthenticated) {
      raiseWarning(`You are not authenticated, cannot synchronize policies. Run ${COMMAND_NAMES.LOGIN} to authenticate first.}`);
      return null;
    }

    await context.policyPuller.refresh();

    return commands.executeCommand(COMMANDS.VALIDATE);
  };
}