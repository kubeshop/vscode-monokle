import { window, env, Uri } from 'vscode';
import { canRun } from '../utils/commands';
import { raiseError, raiseInfo } from '../utils/errors';
import { COMMAND_NAMES } from '../constants';
import { trackEvent } from '../utils/telemetry';
import logger from '../utils/logger';
import type { RuntimeContext } from '../utils/runtime-context';

const AUTH_METHOD_LABELS = {
  'device code': 'Login with a web browser',
  'token': 'Paste an authentication token',
};

export function getLoginCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return;
    }

    trackEvent('command/login', {
      status: 'started',
    });

    const authenticator = context.authenticator;

    if (authenticator.user.isAuthenticated) {
        raiseInfo(`You are already logged in. Please logout first with '${COMMAND_NAMES.LOGIN}'.`);

        trackEvent('command/login', {
          status: 'cancelled',
          error: 'User already logged in.'
        });

        return;
    }

    const method = await pickLoginMethod(authenticator.methods);

    if (!method) {
      trackEvent('command/login', {
        status: 'cancelled',
        error: 'No login method selected.'
      });

      return;
    }

    try {
      let loginRequest: Awaited<ReturnType<typeof authenticator.login>>;

      if (method === 'device code') {
        loginRequest = await authenticator.login(method);

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
      } else if (method === 'token') {
        const accessToken = await window.showInputBox({
            title: 'Monokle Cloud token login',
            placeHolder: 'Enter your Monokle Cloud authentication token',
            prompt: 'You can create account on https://app.monokle.com.',
        });

        if (!accessToken) {
          trackEvent('command/login', {
            status: 'cancelled',
            method,
            error: 'No access token provided.'
          });

          return;
        }

        loginRequest = await authenticator.login(method, accessToken);
      }

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

async function pickLoginMethod(methods: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const quickPick = window.createQuickPick<{label: string, id: string}>();

    quickPick.items = methods.map(method => ({
      label: AUTH_METHOD_LABELS[method] ?? method,
      id: method,
    }));

    quickPick.onDidChangeSelection(async (selection) => {
      if (selection.length > 0) {
        quickPick.hide();
        resolve(selection[0].id);
      }
    });

    quickPick.onDidHide(() => {
      quickPick.dispose();
      resolve(null);
    });

    quickPick.show();
  });
}
