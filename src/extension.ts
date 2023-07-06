import * as vscode from 'vscode';

import { getValidateCommand } from './commands/validate';
import { getWatchCommand } from './commands/watch';
import { SarifWatcher } from './utils/sarif';
import { getShowPanelCommand } from './commands/show-panel';
import { getShowConfigurationCommand } from './commands/show-configuration';
import { getBootstrapConfigurationCommand } from './commands/bootstrap-configuration';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "monokle-vsc" is now active!', vscode.workspace.workspaceFolders);

  const sarifWatcher = new SarifWatcher();

  const configurationWatcher = vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration('monokle.enabled')) {
      const enabled = vscode.workspace.getConfiguration('monokle').get('enabled');
      if (enabled) {
        await vscode.commands.executeCommand('monokle-vsc.validate');
      } else {
        await sarifWatcher.clean();
      }

      await vscode.commands.executeCommand('monokle-vsc.watch');
    }

    if (event.affectsConfiguration('monokle.configurationPath')) {
      vscode.commands.executeCommand('monokle-vsc.validate');
    }
  });
  context.subscriptions.push(configurationWatcher);

  const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
    await vscode.commands.executeCommand('monokle-vsc.validate');
    await vscode.commands.executeCommand('monokle-vsc.watch');
  });
  context.subscriptions.push(workspaceWatcher);

  const commandValidate = vscode.commands.registerCommand('monokle-vsc.validate', getValidateCommand(context, sarifWatcher));
  const commandWatch = vscode.commands.registerCommand('monokle-vsc.watch', getWatchCommand(context, sarifWatcher));
  const commandShowPanel = vscode.commands.registerCommand('monokle-vsc.showPanel', getShowPanelCommand());
  const commandShowConfiguration = vscode.commands.registerCommand('monokle-vsc.showConfiguration', getShowConfigurationCommand(context));
  const commandBootstrapConfiguration = vscode.commands.registerCommand('monokle-vsc.bootstrapConfiguration', getBootstrapConfigurationCommand(context));

  context.subscriptions.push(commandValidate, commandWatch, commandShowPanel, commandShowConfiguration, commandBootstrapConfiguration);

  const isEnabled = vscode.workspace.getConfiguration('monokle').get('enabled');
  if (!isEnabled) {
      return;
  }

  vscode.commands.executeCommand('monokle-vsc.validate');
  vscode.commands.executeCommand('monokle-vsc.watch');

  //@TODO on validation show message: Monokle: Validating workspace (root name, default, local, settings config)
}

export function deactivate() {}
