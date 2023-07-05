import { workspace, window } from 'vscode';
import { getWorkspaceFolders, initializeWorkspaceWatchers } from '../utils/workspace';
import { SarifWatcher } from '../utils/sarif';
import type { ExtensionContext, FileSystemWatcher } from 'vscode';

export function getWatchCommand(context: ExtensionContext, sarifWatcher: SarifWatcher) {
  const watchers: FileSystemWatcher[] = [];

  return async () => {
    watchers.forEach(watcher => watcher.dispose());
    watchers.splice(0, watchers.length);

    const isEnabled = workspace.getConfiguration('monokle').get('enabled');
    if (!isEnabled) {
      window.showInformationMessage('Monokle is disabled for this workspace. Enable it in the settings.');
      return;
    }

    watchers.push(...initializeWorkspaceWatchers(getWorkspaceFolders(), context, sarifWatcher));
  };
}
