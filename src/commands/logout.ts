import { canRun } from '../utils/commands';
import { raiseError, raiseInfo } from '../utils/errors';
import logger from '../utils/logger';
import type { RuntimeContext } from '../utils/runtime-context';

export function getLogoutCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return;
    }

    const authenticator = await context.getAuthenticatorInstance();

    if (!authenticator.user.isAuthenticated) {
        raiseInfo(`You are already logged out. You can login with 'Monokle: Login' command.`);
        return;
    }

    try {
        await authenticator.logout();
        raiseInfo('You have been successfully logged out.');
    } catch (err) {
        logger.error(err);
        raiseError(`Failed to logout from Monokle Cloud. Please try again. Error: ${err.message}`);
    }
  };
}
