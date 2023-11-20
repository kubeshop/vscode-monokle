import { join, normalize } from 'path';
import { commands, workspace, window, StatusBarAlignment } from 'vscode';
import { COMMANDS, SETTINGS, STATUS_BAR_TEXTS, STORAGE_DIR_NAME } from './constants';
import { getLoginCommand } from './commands/login';
import { getValidateCommand } from './commands/validate';
import { getWatchCommand } from './commands/watch';
import { getShowPanelCommand } from './commands/show-panel';
import { getShowConfigurationCommand } from './commands/show-configuration';
import { getBootstrapConfigurationCommand } from './commands/bootstrap-configuration';
import { getSynchronizeCommand } from './commands/synchronize';
import { RuntimeContext } from './utils/runtime-context';
import { SarifWatcher } from './utils/sarif-watcher';
import { PolicyPuller } from './utils/policy-puller';
import { getTooltipContentDefault } from './utils/tooltip';
import { getLogoutCommand } from './commands/logout';
import { getAuthenticator } from './utils/authentication';
import { getSynchronizer } from './utils/synchronization';
import { trackEvent, initTelemetry, closeTelemetry } from './utils/telemetry';
import logger from './utils/logger';
import globals from './utils/globals';
import type { ExtensionContext } from 'vscode';

let runtimeContext: RuntimeContext;

export async function activate(context: ExtensionContext): Promise<any> {
  globals.storagePath = normalize(join(context.extensionPath, STORAGE_DIR_NAME));
  logger.debug = globals.verbose;

  logger.log('Activating extension...');

  // Pre-configure SARIF extension (workaround for #16).
  workspace.getConfiguration('sarif-viewer').update('connectToGithubCodeScanning', 'off');
  workspace.getConfiguration('sarif-viewer.explorer').update('openWhenNoResults', false);

  let isActivated = false;

  const authenticator = await getAuthenticator(globals.origin);
  const synchronizer = await getSynchronizer(globals.origin);

  try {
    globals.setAuthenticator(authenticator);
    globals.setSynchronizer(synchronizer);
  } catch (err: any) {
    // @TODO
    // Notify user about unreachable origin and ask to change it / fallback to default
    // Should retry if fails couple of times
  }

  const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 25);
  statusBarItem.text = STATUS_BAR_TEXTS.DEFAULT;
  statusBarItem.tooltip = getTooltipContentDefault();
  statusBarItem.command = COMMANDS.SHOW_PANEL;
  statusBarItem.show();

  runtimeContext = new RuntimeContext(
    context,
    new SarifWatcher(),
    new PolicyPuller(synchronizer),
    authenticator,
    synchronizer,
    statusBarItem,
  );

  const commandLogin = commands.registerCommand(COMMANDS.LOGIN, getLoginCommand(runtimeContext));
  const commandLogout = commands.registerCommand(COMMANDS.LOGOUT, getLogoutCommand(runtimeContext));
  const commandValidate = commands.registerCommand(COMMANDS.VALIDATE, getValidateCommand(runtimeContext));
  const commandShowPanel = commands.registerCommand(COMMANDS.SHOW_PANEL, getShowPanelCommand());
  const commandShowConfiguration = commands.registerCommand(COMMANDS.SHOW_CONFIGURATION, getShowConfigurationCommand());
  const commandBootstrapConfiguration = commands.registerCommand(COMMANDS.BOOTSTRAP_CONFIGURATION, getBootstrapConfigurationCommand());
  const commandDownloadPolicy = commands.registerCommand(COMMANDS.SYNCHRONIZE, getSynchronizeCommand(runtimeContext));
  const commandWatch = commands.registerCommand(COMMANDS.WATCH, getWatchCommand(runtimeContext));

  const configurationWatcher = workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration(SETTINGS.ENABLED_PATH)) {
      const enabled = globals.enabled;

      trackEvent('config/change', {
        status: 'success',
        name: SETTINGS.ENABLED,
        value: String(enabled),
      });

      if (enabled) {
        await initTelemetry();
        await runtimeContext.policyPuller.refresh();
        await commands.executeCommand(COMMANDS.VALIDATE);
        await commands.executeCommand(COMMANDS.WATCH);
      } else {
        await closeTelemetry();
        await runtimeContext.dispose();
      }
    }

    if (event.affectsConfiguration(SETTINGS.CONFIGURATION_PATH_PATH)) {
      trackEvent('config/change', {
        status: 'success',
        name: SETTINGS.CONFIGURATION_PATH,
        value: 'redacted', // Can include sensitive data.
      });

      await commands.executeCommand(COMMANDS.VALIDATE);
    }

    if (event.affectsConfiguration(SETTINGS.VERBOSE_PATH)) {
      trackEvent('config/change', {
        status: 'success',
        name: SETTINGS.VERBOSE,
        value: String(globals.verbose),
      });

      logger.debug = globals.verbose;
    }

    if (event.affectsConfiguration(SETTINGS.ORIGIN_PATH)) {
      trackEvent('config/change', {
        status: 'success',
        name: SETTINGS.ORIGIN,
        value: 'redacted', // Can include sensitive data.
      });

      // @TODO
      // If origin changes we should logout user too from previous one
      // Also synchronizer and authenticator should be recreated from new origin
      await runtimeContext.policyPuller.refresh();
      await commands.executeCommand(COMMANDS.VALIDATE);
    }

    if (event.affectsConfiguration(SETTINGS.TELEMETRY_ENABLED_PATH)) {
      trackEvent('config/change', {
        status: 'success',
        name: SETTINGS.TELEMETRY_ENABLED,
        value: String(globals.telemetryEnabled),
      });

      if (globals.telemetryEnabled) {
        await initTelemetry();
      } else {
        await closeTelemetry();
      }
    }
  });

  const workspaceWatcher = workspace.onDidChangeWorkspaceFolders(async () => {
    trackEvent('workspace/change', {
      status: 'success',
      rootCount: workspace.workspaceFolders?.length ?? 0,
    });

    await runtimeContext.policyPuller.refresh();
    await commands.executeCommand(COMMANDS.VALIDATE);
    await commands.executeCommand(COMMANDS.WATCH);
  });

  authenticator.on('login', async (user) => {
    logger.log('EVENT:login', user, isActivated);

    if (!isActivated || !globals.enabled) {
      return;
    }

    await runtimeContext.policyPuller.refresh();
    await commands.executeCommand(COMMANDS.VALIDATE);
  });

  authenticator.on('logout', async () => {
    logger.log('EVENT:logout', isActivated);

    if (!isActivated || !globals.enabled) {
      return;
    }

    await runtimeContext.policyPuller.refresh();
    await commands.executeCommand(COMMANDS.VALIDATE);
  });

  synchronizer.on('synchronize', async (policy) => {
    logger.log('EVENT:synchronize', policy, isActivated);

    if (!isActivated || !globals.enabled) {
      return;
    }

    await runtimeContext.policyPuller.refresh();
    await commands.executeCommand(COMMANDS.VALIDATE);
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

  await initTelemetry();
  await runtimeContext.policyPuller.refresh();
  await commands.executeCommand(COMMANDS.VALIDATE);
  await commands.executeCommand(COMMANDS.WATCH);

  isActivated = true;

  logger.log('Extension activated...', globals.asObject());
}

export async function deactivate() {
  logger.log('Deactivating extension...');

  await closeTelemetry();

  if (runtimeContext) {
    runtimeContext.dispose();
    runtimeContext.authenticator.removeAllListeners();
    runtimeContext.synchronizer.removeAllListeners();
  }
}
