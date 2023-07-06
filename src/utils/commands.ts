import { workspace, window } from 'vscode';

export function canRun() {
  const isEnabled = workspace.getConfiguration('monokle').get('enabled');
  if (!isEnabled) {
    window.showInformationMessage('Monokle is disabled for this workspace. Enable it in the settings.');
  }

  return isEnabled;
}