import { join, normalize } from 'path';
import { commands, workspace, window, StatusBarAlignment } from 'vscode';
import { COMMANDS, SETTINGS, STATUS_BAR_TEXTS, STORAGE_DIR_NAME } from './constants';
import { getValidateCommand } from './commands/validate';
import { getWatchCommand } from './commands/watch';
import { getShowPanelCommand } from './commands/show-panel';
import { getShowConfigurationCommand } from './commands/show-configuration';
import { getBootstrapConfigurationCommand } from './commands/bootstrap-configuration';
import { RuntimeContext } from './utils/runtime-context';
import { SarifWatcher } from './utils/sarif-watcher';
import { PolicyPuller } from './utils/policy-puller';
import logger from './utils/logger';
import globals from './utils/globals';
import type { ExtensionContext } from 'vscode';

let runtimeContext: RuntimeContext;

export function activate(context: ExtensionContext) {
  globals.storagePath = normalize(join(context.extensionPath, STORAGE_DIR_NAME));
  logger.debug = globals.verbose;

  logger.log('Activating extension...', globals.asObject());

  const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 25);
  statusBarItem.text = STATUS_BAR_TEXTS.DEFAULT;
  statusBarItem.tooltip = 'Show validation panel';
  statusBarItem.command = COMMANDS.SHOW_PANEL;
  statusBarItem.show();

  runtimeContext = new RuntimeContext(
    context,
    new SarifWatcher(),
    new PolicyPuller(globals.remotePolicyUrl),
    statusBarItem
  );

  const commandValidate = commands.registerCommand(COMMANDS.VALIDATE, getValidateCommand(runtimeContext));
  const commandShowPanel = commands.registerCommand(COMMANDS.SHOW_PANEL, getShowPanelCommand());
  const commandShowConfiguration = commands.registerCommand(COMMANDS.SHOW_CONFIGURATION, getShowConfigurationCommand());
  const commandBootstrapConfiguration = commands.registerCommand(COMMANDS.BOOTSTRAP_CONFIGURATION, getBootstrapConfigurationCommand());
  const commandWatch = commands.registerCommand(COMMANDS.WATCH, getWatchCommand(runtimeContext));
  // @TODO add command to refetch remote policy

  const configurationWatcher = workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration(SETTINGS.ENABLED_PATH)) {
      const enabled = globals.enabled;
      if (enabled) {
        await runtimeContext.policyPuller.refresh();
        await commands.executeCommand(COMMANDS.VALIDATE);
        await commands.executeCommand(COMMANDS.WATCH);
      } else {
        await runtimeContext.dispose();
      }
    }

    if (event.affectsConfiguration(SETTINGS.CONFIGURATION_PATH_PATH)) {
      commands.executeCommand(COMMANDS.VALIDATE);
    }

    if (event.affectsConfiguration(SETTINGS.VERBOSE_PATH)) {
      logger.debug = globals.verbose;
    }

    if (event.affectsConfiguration(SETTINGS.REMOTE_POLICY_URL_PATH)) {
      runtimeContext.policyPuller.url = globals.remotePolicyUrl;
      await runtimeContext.policyPuller.refresh();
      await commands.executeCommand(COMMANDS.VALIDATE);
    }
  });

  const workspaceWatcher = workspace.onDidChangeWorkspaceFolders(async () => {
    await runtimeContext.policyPuller.refresh();
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

  if (!globals.enabled) {
    return;
  }

  runtimeContext.policyPuller.refresh()
    .then(() => commands.executeCommand(COMMANDS.VALIDATE))
    .then(() => commands.executeCommand(COMMANDS.WATCH));
}

export function deactivate() {
  logger.log('Deactivating extension...');

  if (runtimeContext) {
    runtimeContext.dispose();
  }
}
