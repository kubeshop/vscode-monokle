import { getWorkspaceFolders, initializeWorkspaceWatchers } from '../utils/workspace';
import { SarifWatcher } from '../utils/sarif';
import { canRun } from '../utils/commands';
import type { ExtensionContext, FileSystemWatcher } from 'vscode';

export function getWatchCommand(context: ExtensionContext, sarifWatcher: SarifWatcher) {
  const watchers: FileSystemWatcher[] = [];

  return async () => {
    watchers.forEach(watcher => watcher.dispose());
    watchers.splice(0, watchers.length);

    if (!canRun()) {
      return;
    }

    watchers.push(...initializeWorkspaceWatchers(getWorkspaceFolders(), context, sarifWatcher));
  };
}
