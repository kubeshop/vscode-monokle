import { canRun } from '../utils/commands';
import { raiseError, raiseInfo } from '../utils/errors';
import { emptyStoreAuth } from '../utils/store';
import logger from '../utils/logger';
import globals from '../utils/globals';
import type { RuntimeContext } from '../utils/runtime-context';

export function getLogoutCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return;
    }

    if (!globals.user.isAuthenticated) {
        raiseInfo(`You are already logged out. You can login with 'Monokle: Login' command.`);
        return;
    }

    try {
        await emptyStoreAuth();
        raiseInfo('You have been successfully logged out.');
        context.triggerUserChange();
    } catch (err) {
        logger.error(err);
        raiseError('Failed to logout from Monokle Cloud. Please try again.');
    }
  };
}
