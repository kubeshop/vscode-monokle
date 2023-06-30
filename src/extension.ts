import * as vscode from 'vscode';
import { getValidateCommand } from './commands/validate';
import { getWatchCommand } from './commands/watch';

// watchers[] (to deregister on deactivate)

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "monokle-vsc" is now active!', vscode.workspace.workspaceFolders);

  // High level flow:
  // Init watcher for each workspace folder
  // Validate each workspace folder on init
  // - should look for monokle config file in each workspace separately
  // - fallback to default config
  // Show errors
  // - should be shown as one, gathered from all workspaces

  // Validating workspace:
  // - find all yaml files
  // - parse them and convert to resources
  // - pass to validator (for multipe workspaces gather all and pass at once)

  // Watching workspaces:
  // TBD...

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (!event.affectsConfiguration('monokle-vsc')) {
      return;
    }

    // TODO react to config changes
  });

  // TODO
  // onDidChangeWorkspaceFolders - folders can be added/removed from workspace anytime

  const settingsEnabled = vscode.workspace.getConfiguration('monokle').get('enabled');
  const settingsConfigurationPath = vscode.workspace.getConfiguration('monokle').get('configurationPath');

  console.log(settingsEnabled, settingsConfigurationPath);

  if (!settingsEnabled) {
      return;
  }

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const commandValidate = vscode.commands.registerCommand('monokle-vsc.validate', getValidateCommand(context));
  const commandWatch = vscode.commands.registerCommand('monokle-vsc.watch', getWatchCommand(context));

  context.subscriptions.push(commandValidate, commandWatch);

  vscode.commands.executeCommand('monokle-vsc.validate');
  vscode.commands.executeCommand('monokle-vsc.watch');
}

// This method is called when your extension is deactivated
// TODO deregister fs watchers, clear sarif logs?
export function deactivate() {}
