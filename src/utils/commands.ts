import { workspace, window } from 'vscode';
import { SETTINGS } from '../constants';
import { raiseInfo, raiseWarning } from './errors';
import { RuntimeContext } from './runtime-context';

export function canRun() {
  const isEnabled = workspace.getConfiguration(SETTINGS.NAMESPACE).get(SETTINGS.ENABLED);
  if (!isEnabled) {
    raiseInfo('Monokle is disabled for this workspace. Enable it in the settings.');
  }

  return isEnabled;
}

export function disabledForLocal(context: RuntimeContext, command: string) {
  if (context.isLocal) {
    raiseWarning(
      `Command ${command} is not available in local mode. Make sure you are connected to the internet and have correct 'monokle.origin' configured.`,
      [],
      {
        modal: true,
      },
    );
    return true;
  }

  return false;
}
