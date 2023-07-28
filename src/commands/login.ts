import { window } from 'vscode';
import { canRun } from '../utils/commands';
import { raiseError, raiseInfo } from '../utils/errors';
import { getUser } from '../utils/api';
import { setStoreAuth } from '../utils/store';
import globals from '../utils/globals';
import logger from '../utils/logger';
import type { RuntimeContext } from '../utils/runtime-context';

export function getLoginCommand(context: RuntimeContext) {
  return async () => {
    if (!canRun()) {
      return;
    }

    if (globals.user.isAuthenticated) {
        raiseInfo(`You are already logged in. Please logout first with 'Monokle: Logout'.`);
        return;
    }

    const token = await window.showInputBox({
        title: 'Monokle Cloud login',
        placeHolder: 'Enter your Monokle Cloud token',
        prompt: 'You can create account on https://app.monokle.com.',
    });

    if (!token) {
        raiseInfo('Monokle Cloud login cancelled. Resources will be validated with local configuration.');
        return;
    }

    try {
        const userData = await getUser(token.trim());
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
