import { window, env, Uri } from 'vscode';
import { canRun } from '../utils/commands';
import { raiseError, raiseInfo } from '../utils/errors';
import logger from '../utils/logger';
import type { TokenSet } from 'openid-client';
import type { RuntimeContext } from '../utils/runtime-context';

export type AccessToken = {
  access_token: string;
  token_type: 'access_token';
};

export type Token = AccessToken | TokenSet;

const AUTH_METHOD_LABELS = {
  'device code': 'Login with a web browser',
  'token': 'Paste an authentication token',
};

export function getLoginCommand(context: RuntimeContext) {

  return async () => {
    if (!canRun()) {
      return;
    }

    const authenticator = await context.getAuthenticatorInstance();

    if (authenticator.user.isAuthenticated) {
        raiseInfo(`You are already logged in. Please logout first with 'Monokle: Logout'.`);
        return;
    }

    const method = await pickLoginMethod(authenticator.methods);

    if (!method) {
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

        loginRequest = await authenticator.login(method, accessToken);
      }

      if (!loginRequest) {
          return;
      }

      const user = await loginRequest.onDone;

      raiseInfo(`You are now logged in as ${user.email}.`);
    } catch (err) {
        logger.error(err);
        raiseError(`Failed to login to Monokle Cloud. Please try again. Error: ${err.message}`);
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
