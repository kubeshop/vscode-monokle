import * as vscode from 'vscode';
import { getValidateCommand } from './commands/validate';
import { getWatchCommand } from './commands/watch';

export type MonokleSettings = {
  enabled: boolean;
  configurationPath: string;
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "monokle-vsc" is now active!', vscode.workspace.workspaceFolders);

  const configurationWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('monokle.enabled')) {
      const enabled = vscode.workspace.getConfiguration('monokle').get('enabled');
      // @TODO
      // disable - stop file watchers if running
      // enabled - restart file watchers
    }

    if (event.affectsConfiguration('monokle.configurationPath')) {
      const configurationPath = vscode.workspace.getConfiguration('monokle').get('configurationPath');
      // @TODO revalidate resources with new config
    }
  });
  context.subscriptions.push(configurationWatcher);

  const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    // @TODO revalidate resources and restart files watchers
  });
  context.subscriptions.push(workspaceWatcher);

  const commandValidate = vscode.commands.registerCommand('monokle-vsc.validate', getValidateCommand(context));
  const commandWatch = vscode.commands.registerCommand('monokle-vsc.watch', getWatchCommand(context));
  //@TODO Show configuration coomand - save config to a file and open it in editor
  // File should have a format # Config for /path/to/folder\n# Based on /path/to/monokle.yaml|default\nconfig
  context.subscriptions.push(commandValidate, commandWatch);

  const isEnabled = vscode.workspace.getConfiguration('monokle').get('enabled');
  if (!isEnabled) {
      return;
  }

  vscode.commands.executeCommand('monokle-vsc.validate');
  vscode.commands.executeCommand('monokle-vsc.watch');

  //@TODO on validation show message: Monokle: Validating workspace (root name, default, local, settings config)
}

export function deactivate() {}
