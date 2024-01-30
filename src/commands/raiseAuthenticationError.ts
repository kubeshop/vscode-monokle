import { canRun } from '../utils/commands';
import { Event, trackEvent } from '../utils/telemetry';
import type { RuntimeContext } from '../utils/runtime-context';
import { raiseError } from '../utils/errors';
import { commands } from 'vscode';
import { COMMANDS } from '../constants';
import { CustomEventData } from './track';

// This is internal command (not exposed via 'package.json') to raise and track authentication errors.
export function getRaiseAuthenticationErrorCommand(_context: RuntimeContext) {
  let warning: Promise<unknown> | null = null;

  return async (message: string, track: { event: Event , data: CustomEventData }) => {
    if (!canRun()) {
      return;
    }
    if(!warning) {
      warning = raiseError(message ?? track?.data?.error, [{
          title: 'Login',
          callback() {
            commands.executeCommand(COMMANDS.LOGIN);
          },
        }
      ]).then(() => void (warning = null));
    }

    if(track?.event && track?.data) {
      trackEvent(track.event, track.data);
    }
  };
}
