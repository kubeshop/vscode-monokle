import { canRun } from '../utils/commands';
import { Command, commands } from 'vscode';
import type { RuntimeContext } from '../utils/runtime-context';

// This is internal command (not exposed via 'package.json') to run multiple commands at once from code actions.
export function getRunCommandsCommand(_context: RuntimeContext) {
  return async (allCommands: Command[]) => {
    if (!canRun()) {
      return;
    }

    for (const command of allCommands) {
        await commands.executeCommand(command.command, ...(command.arguments || []));
    }
  };
}
