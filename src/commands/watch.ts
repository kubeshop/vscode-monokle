import { getWorkspaceFolders, initializeWorkspaceWatchers } from '../utils/workspace';
import { canRun } from '../utils/commands';
import type { Disposable } from 'vscode';
import type { RuntimeContext } from '../utils/runtime-context';

export function getWatchCommand(context: RuntimeContext) {
  const watchers: Disposable[] = [];

  return async () => {
    if (!canRun()) {
      return;
    }

    watchers.forEach(watcher => watcher.dispose());
    watchers.splice(0, watchers.length);

    const newWatchers = await initializeWorkspaceWatchers(getWorkspaceFolders(), context);

    context.registerDisposables(newWatchers);
    watchers.push(...newWatchers);
  };
}
