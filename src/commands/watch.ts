import { getWorkspaceFolders, initializeWorkspaceWatchers } from '../utils/workspace';
import { canRun } from '../utils/commands';
import type { FileSystemWatcher } from 'vscode';
import type { RuntimeContext } from '../utils/runtime-context';

export function getWatchCommand(context: RuntimeContext) {
  const watchers: FileSystemWatcher[] = [];

  return async () => {
    watchers.forEach(watcher => watcher.dispose());
    watchers.splice(0, watchers.length);

    if (!canRun()) {
      return;
    }

    const newWatchers = initializeWorkspaceWatchers(getWorkspaceFolders(), context.extensionContext, context.sarifWatcher);

    context.registerDisposables(newWatchers);
    watchers.push(...newWatchers);
  };
}
