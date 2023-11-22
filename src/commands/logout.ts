import { commands } from 'vscode';
import { canRun, disabledForLocal } from '../utils/commands';
import { raiseError, raiseInfo } from '../utils/errors';
import { COMMAND_NAMES, COMMANDS } from '../constants';
import { trackEvent } from '../utils/telemetry';
import logger from '../utils/logger';
import globals from '../utils/globals';
import type { RuntimeContext } from '../utils/runtime-context';

export type LogoutOptions = {
  originChanged?: boolean;
};

export function getLogoutCommand(context: RuntimeContext) {
  return async (options?: LogoutOptions) => {
    if (!canRun() || disabledForLocal(context, COMMAND_NAMES.LOGOUT)) {
      return;
    }

    trackEvent('command/logout', {
      status: 'started',
    });

    const authenticator = context.authenticator;
    const user = await globals.getUser();

    if (!user.isAuthenticated) {
        raiseInfo(`You are already logged out. You can login with '${COMMAND_NAMES.LOGIN}' command.`);

        trackEvent('command/logout', {
          status: 'cancelled',
          error: 'User already logged out.'
        });

        return;
    }

    try {
        await authenticator.logout();

        if (options?.originChanged) {
          raiseInfo('Logged out due to origin configuration change.', [{
            title: 'Login to new origin',
            callback: async () => commands.executeCommand(COMMANDS.LOGIN),
          }]);
        } else {
          raiseInfo('You have been successfully logged out.');
        }

        trackEvent('command/logout', {
          status: 'success',
        });
    } catch (err) {
        logger.error(err);
        raiseError(`Failed to logout from Monokle Cloud. Please try again. Error: ${err.message}`);

        trackEvent('command/logout', {
          status: 'failure',
          error: err.message,
        });
    }
  };
}
