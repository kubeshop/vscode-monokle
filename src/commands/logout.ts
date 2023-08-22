import { canRun } from '../utils/commands';
import { raiseError, raiseInfo } from '../utils/errors';
import { COMMAND_NAMES } from '../constants';
import { trackEvent } from '../utils/telemetry';
import logger from '../utils/logger';
import type { RuntimeContext } from '../utils/runtime-context';

export function getLogoutCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return;
    }

    trackEvent('command/logout', {
      status: 'started',
    });

    const authenticator = context.authenticator;

    if (!authenticator.user.isAuthenticated) {
        raiseInfo(`You are already logged out. You can login with '${COMMAND_NAMES.LOGOUT}' command.`);

        trackEvent('command/logout', {
          status: 'cancelled',
          error: 'User already logged out.'
        });

        return;
    }

    try {
        await authenticator.logout();
        raiseInfo('You have been successfully logged out.');

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
