import { workspace, window } from 'vscode';
import { SETTINGS } from '../constants';

export function canRun() {
  const isEnabled = workspace.getConfiguration(SETTINGS.NAMESPACE).get(SETTINGS.ENABLED);
  if (!isEnabled) {
    window.showInformationMessage('Monokle is disabled for this workspace. Enable it in the settings.');
  }

  return isEnabled;
}
