import { join, normalize } from 'path';
import { commands, workspace, window, StatusBarAlignment, MarkdownString } from 'vscode';
import { COMMANDS, SETTINGS, STATUS_BAR_TEXTS, STORAGE_DIR_NAME } from './constants';
import { getLoginCommand } from './commands/login';
import { getValidateCommand } from './commands/validate';
import { getWatchCommand } from './commands/watch';
import { getShowPanelCommand } from './commands/show-panel';
import { getShowConfigurationCommand } from './commands/show-configuration';
import { getBootstrapConfigurationCommand } from './commands/bootstrap-configuration';
import { getDownloadPolicyCommand } from './commands/download-policy';
import { RuntimeContext } from './utils/runtime-context';
import { SarifWatcher } from './utils/sarif-watcher';
import { PolicyPuller } from './utils/policy-puller';
import { getTooltipContentDefault } from './utils/tooltip';
import { getLogoutCommand } from './commands/logout';
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
  statusBarItem.tooltip = getTooltipContentDefault();
  statusBarItem.command = COMMANDS.SHOW_PANEL;
  statusBarItem.show();

  runtimeContext = new RuntimeContext(
    context,
    new SarifWatcher(),
    new PolicyPuller(),
    statusBarItem
  );

  const commandLogin = commands.registerCommand(COMMANDS.LOGIN, getLoginCommand(runtimeContext));
  const commandLogout = commands.registerCommand(COMMANDS.LOGOUT, getLogoutCommand(runtimeContext));
  const commandValidate = commands.registerCommand(COMMANDS.VALIDATE, getValidateCommand(runtimeContext));
  const commandShowPanel = commands.registerCommand(COMMANDS.SHOW_PANEL, getShowPanelCommand());
  const commandShowConfiguration = commands.registerCommand(COMMANDS.SHOW_CONFIGURATION, getShowConfigurationCommand());
  const commandBootstrapConfiguration = commands.registerCommand(COMMANDS.BOOTSTRAP_CONFIGURATION, getBootstrapConfigurationCommand());
  const commandDownloadPolicy = commands.registerCommand(COMMANDS.DOWNLOAD_POLICY, getDownloadPolicyCommand(runtimeContext));
  const commandWatch = commands.registerCommand(COMMANDS.WATCH, getWatchCommand(runtimeContext));

  const configurationWatcher = workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration(SETTINGS.ENABLED_PATH)) {
      const enabled = globals.enabled;
      if (enabled) {
        await initialRun(runtimeContext);
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

    if (event.affectsConfiguration(SETTINGS.OVERWRITE_REMOTE_POLICY_URL_PATH)) {
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
    commandLogin,
    commandLogout,
    commandValidate,
    commandWatch,
    commandShowPanel,
    commandShowConfiguration,
    commandBootstrapConfiguration,
    commandDownloadPolicy,
    configurationWatcher,
    workspaceWatcher
  );

  if (!globals.enabled) {
    return;
  }

  initialRun(runtimeContext);
}

export function deactivate() {
  logger.log('Deactivating extension...');

  if (runtimeContext) {
    runtimeContext.dispose();
  }
}

function initialRun(runtimeContext: RuntimeContext) {
  runtimeContext.onUserChanged(() => {
    runtimeContext.policyPuller.refresh()
      .then(() => commands.executeCommand(COMMANDS.VALIDATE))
      .then(() => commands.executeCommand(COMMANDS.WATCH));
  });

  runtimeContext.policyPuller.refresh()
    .then(() => commands.executeCommand(COMMANDS.VALIDATE))
    .then(() => commands.executeCommand(COMMANDS.WATCH));
}
