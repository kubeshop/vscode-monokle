import * as vscode from 'vscode';
import { ExtensionContext, FileSystemWatcher } from 'vscode';
import { getWorkspaceFolders, initializeWorkspaceWatchers } from '../utils/workspace';

export function getWatchCommand(context: ExtensionContext) {
  const watchers: FileSystemWatcher[] = [];

  return async () => {
    const isEnabled = vscode.workspace.getConfiguration('monokle').get('enabled');
    if (!isEnabled) {
      vscode.window.showInformationMessage('Monokle is disabled for this workspace. Enable it in the settings.');
      return;
    }

    watchers.forEach(watcher => watcher.dispose());
    watchers.splice(0, watchers.length);
    watchers.push(...initializeWorkspaceWatchers(getWorkspaceFolders(), context));
  };
}