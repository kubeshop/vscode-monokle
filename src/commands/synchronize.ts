import { commands } from 'vscode';
import { canRun } from '../utils/commands';
import { COMMANDS, COMMAND_NAMES } from '../constants';
import { raiseWarning } from '../utils/errors';
import { trackEvent } from '../utils/telemetry';
import globals from '../utils/globals';
import type { RuntimeContext } from '../utils/runtime-context';

export function getSynchronizeCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return null;
    }

    trackEvent('command/synchronize', {
      status: 'started'
    });

    const user = await globals.getUser();

    if (!user.isAuthenticated) {
      raiseWarning(`You are not authenticated, cannot synchronize policies. Run ${COMMAND_NAMES.LOGIN} to authenticate first.}`);

      trackEvent('command/synchronize', {
        status: 'cancelled',
        error: 'User not authenticated.'
      });

      return null;
    }

    await context.policyPuller.refresh();

    trackEvent('command/synchronize', {
      status: 'success'
    });

    return commands.executeCommand(COMMANDS.VALIDATE);
  };
}