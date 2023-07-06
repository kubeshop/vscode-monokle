import { commands, workspace } from 'vscode';
import { COMMANDS, SETTINGS } from './constants';
import { getValidateCommand } from './commands/validate';
import { getWatchCommand } from './commands/watch';
import { getShowPanelCommand } from './commands/show-panel';
import { getShowConfigurationCommand } from './commands/show-configuration';
import { getBootstrapConfigurationCommand } from './commands/bootstrap-configuration';
import { RuntimeContext } from './utils/runtime-context';
import { SarifWatcher } from './utils/sarif-watcher';
import type { ExtensionContext } from 'vscode';

let runtimeContext: RuntimeContext;

export function activate(context: ExtensionContext) {
  runtimeContext = new RuntimeContext(
    context,
    new SarifWatcher()
  );

  const commandValidate = commands.registerCommand(COMMANDS.VALIDATE, getValidateCommand(runtimeContext));
  const commandShowPanel = commands.registerCommand(COMMANDS.SHOW_PANEL, getShowPanelCommand());
  const commandShowConfiguration = commands.registerCommand(COMMANDS.SHOW_CONFIGURATION, getShowConfigurationCommand(runtimeContext));
  const commandBootstrapConfiguration = commands.registerCommand(COMMANDS.BOOTSTRAP_CONFIGURATION, getBootstrapConfigurationCommand());
  const commandWatch = commands.registerCommand(COMMANDS.WATCH, getWatchCommand(runtimeContext));

  const configurationWatcher = workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration(SETTINGS.ENABLED_PATH)) {
      const enabled = workspace.getConfiguration(SETTINGS.NAMESPACE).get(SETTINGS.ENABLED);
      if (enabled) {
        await commands.executeCommand(COMMANDS.VALIDATE);
      } else {
        await runtimeContext.sarifWatcher.clean();
      }

      await commands.executeCommand(COMMANDS.WATCH);
    }

    if (event.affectsConfiguration(SETTINGS.CONFIGURATION_PATH_PATH)) {
      commands.executeCommand(COMMANDS.VALIDATE);
    }
  });

  const workspaceWatcher = workspace.onDidChangeWorkspaceFolders(async () => {
    await commands.executeCommand(COMMANDS.VALIDATE);
    await commands.executeCommand(COMMANDS.WATCH);
  });

  context.subscriptions.push(
    commandValidate,
    commandWatch,
    commandShowPanel,
    commandShowConfiguration,
    commandBootstrapConfiguration,
    configurationWatcher,
    workspaceWatcher
  );

  const isEnabled = workspace.getConfiguration(SETTINGS.NAMESPACE).get(SETTINGS.ENABLED);
  if (!isEnabled) {
    return;
  }

  commands.executeCommand(COMMANDS.VALIDATE).then(() => commands.executeCommand(COMMANDS.WATCH));
}

export function deactivate() {
  if (runtimeContext) {
    runtimeContext.disposables.forEach(disposable => disposable.dispose());
    runtimeContext.sarifWatcher.clean();
  }
}
