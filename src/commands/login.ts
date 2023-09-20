import { env, Uri } from 'vscode';
import { canRun } from '../utils/commands';
import { raiseError, raiseInfo } from '../utils/errors';
import { COMMAND_NAMES } from '../constants';
import { trackEvent } from '../utils/telemetry';
import logger from '../utils/logger';
import globals from '../utils/globals';
import type { RuntimeContext } from '../utils/runtime-context';

export function getLoginCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return;
    }

    trackEvent('command/login', {
      status: 'started',
    });

    const authenticator = context.authenticator;
    const user = await globals.getUser();

    if (user.isAuthenticated) {
        raiseInfo(`You are already logged in. Please logout first with '${COMMAND_NAMES.LOGOUT}'.`);

        trackEvent('command/login', {
          status: 'cancelled',
          error: 'User already logged in.'
        });

        return;
    }

    const method = 'device code';

    try {
      const loginRequest = await authenticator.login(method);
      const handle =  loginRequest.handle;

      raiseInfo(
        `Please open ${handle.verification_uri_complete} and enter the code ${handle.user_code} to login.`,
        [{
          title: 'Open login page',
          callback: () => {
            env.openExternal(Uri.parse(handle.verification_uri_complete));
          }
        }],
        {
          modal: true,
        },
      );

      if (!loginRequest) {
        trackEvent('command/login', {
          status: 'cancelled',
          method,
        });

        return;
      }

      const user = await loginRequest.onDone;

      raiseInfo(`You are now logged in as ${user.email}.`);

      trackEvent('command/login', {
        status: 'success',
        method,
      });
    } catch (err) {
        logger.error(err);
        raiseError(`Failed to login to Monokle Cloud. Please try again. Error: ${err.message}`);

        trackEvent('command/login', {
          status: 'failure',
          method,
          error: err.message,
        });
    }
  };
}
