import { env, Uri, window } from 'vscode';
import { canRun, disabledForLocal } from '../utils/commands';
import { raiseError, raiseInfo } from '../utils/errors';
import { COMMAND_NAMES } from '../constants';
import { trackEvent } from '../utils/telemetry';
import logger from '../utils/logger';
import globals from '../utils/globals';
import type { RuntimeContext } from '../utils/runtime-context';

let pendingLoginRequest: Awaited<ReturnType<RuntimeContext['authenticator']['login']>> | undefined = undefined;

export function getLoginCommand(context: RuntimeContext) {
  return async () => {
    abortPendingLogin();

    if (!canRun() || disabledForLocal(context, COMMAND_NAMES.LOGIN)) {
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
      const loginRequest = pendingLoginRequest = await authenticator.login(method);

      if (!loginRequest) {
        abortPendingLogin();

        trackEvent('command/login', {
          status: 'cancelled',
          method,
        });

        return;
      }

      const handle =  loginRequest.handle;

      const loginPromptResult = await window.showInformationMessage(
        `Please open ${handle.verification_uri_complete} and enter the code ${handle.user_code} to login.`,
        {
          modal: true,
        },
        {title:'Open login page'}
      );

      if (!loginPromptResult) {
        abortPendingLogin();

        trackEvent('command/login', {
          status: 'cancelled',
          method,
          error: 'User cancelled login prompt.'
        });

        return;
      }

      // We can't really rely on the return value of 'env.openExternal' since it returns false in any case but 'Open' button
      // (e.g. for copy button). So this is not a good indication of whether the user wants to continue or not.
      await env.openExternal(Uri.parse(handle.verification_uri_complete));

      const user = await loginRequest.onDone;

      raiseInfo(`You are now logged in as ${user.email}.`);

      trackEvent('command/login', {
        status: 'success',
        method,
      });
    } catch (err) {
      if (err.message === 'polling aborted') {
        // This is expected upon cancellation of pending login request.
        logger.log('Polling aborted', err);
      } else {
        logger.error(err);
        raiseError(`Failed to login to Monokle Cloud. Please try again. Error: ${err.message}`);

        abortPendingLogin();

        trackEvent('command/login', {
          status: 'failure',
          method,
          error: err.message,
        });
      }
    }
  };
}

function abortPendingLogin() {
  try {
    if (pendingLoginRequest) {
      const handle = pendingLoginRequest.handle;
      pendingLoginRequest = undefined;
      handle?.abort();
    }
  } catch (err) {
    logger.error(err);
  }
}
