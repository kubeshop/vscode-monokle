import { ExtensionContext, FileSystemWatcher } from 'vscode';
import { getWorkspaceFolders, initializeWorkspaceWatchers } from '../utils/workspace';

export function getWatchCommand(context: ExtensionContext) {
  const watchers: FileSystemWatcher[] = [];

  return async () => {
    watchers.forEach(watcher => watcher.dispose());
    watchers.splice(0, watchers.length);
    watchers.push(...initializeWorkspaceWatchers(getWorkspaceFolders(), context));
  };
}