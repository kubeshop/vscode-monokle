import { window, env, Uri } from 'vscode';
import { canRun } from '../utils/commands';
import { raiseError, raiseInfo } from '../utils/errors';
import { getUser } from '../utils/api';
import { setStoreAuth } from '../utils/store';
import { initializeAuthFlow, pollAuthFlow } from '../utils/device-flow';
import globals from '../utils/globals';
import logger from '../utils/logger';
import type { TokenSet } from 'openid-client';
import type { RuntimeContext } from '../utils/runtime-context';

export type AccessToken = {
  access_token: string;
  token_type: 'access_token';
};

export type Token = AccessToken | TokenSet;

export function getLoginCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return;
    }

    if (globals.user.isAuthenticated) {
        raiseInfo(`You are already logged in. Please logout first with 'Monokle: Logout'.`);
        return;
    }

    const method = await pickLoginMethod();

    if (!method) {
        raiseInfo('Monokle Cloud login cancelled. Resources will be validated with local configuration.');
        return;
    }

    let token: Token | null = null;
    if (method === 'device') {
      const handle = await initializeAuthFlow();

      raiseInfo(
        `Please open ${handle.verification_uri_complete} and enter the code ${handle.user_code} to login.`,
        [{
          title: 'Open login page',
          callback: () => {
            env.openExternal(Uri.parse(handle.verification_uri_complete));
          }
        }]
      );

      const tokenSet = await pollAuthFlow(handle);

      if (tokenSet) {
        token = tokenSet;
      }
    } else if (method === 'token') {
      const accessToken = await window.showInputBox({
          title: 'Monokle Cloud login',
          placeHolder: 'Enter your Monokle Cloud token',
          prompt: 'You can create account on https://app.monokle.com.',
      });

      if (accessToken) {
        token = ({
          access_token: accessToken,
          token_type: 'access_token',
        });
      }
    }

    if (!token) {
        raiseInfo('Monokle Cloud login cancelled. Resources will be validated with local configuration.');
        return;
    }

    try {
      const userData = await getUser(token.access_token);
      // @TODO As long as token is not connected to Monokle API all further API requests (e.g. the one above) will fail.
      // It can be tested buy bootstrapping data as below.
      // const userData = {
      //   data: {
      //     me: {
      //       email: 'test@test.com',
      //     },
      //   },
      // };
      const authSaved = await setStoreAuth(userData?.data.me.email, token);

      context.triggerUserChange();

      logger.log('login:authSaved', userData, authSaved);

      raiseInfo(`You are now logged in as ${userData?.data.me.email}.`);
    } catch (err) {
        logger.error(err);
        raiseError('Failed to login to Monokle Cloud. Please check out your token and try again.');
    }
  };
}

async function pickLoginMethod(): Promise<string | null> {
  return new Promise((resolve) => {
    const quickPick = window.createQuickPick<{label: string, id: string}>();

    quickPick.items = [
      {
        label: 'Device code',
        id: 'device',
      },
      {
        label: 'Token',
        id: 'token',
      },
    ];

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
