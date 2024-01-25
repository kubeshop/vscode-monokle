import pRetry from 'p-retry';
import { join, normalize } from 'path';
import { commands, workspace, window, StatusBarAlignment, languages } from 'vscode';
import { COMMANDS, SETTINGS, STATUS_BAR_TEXTS, STORAGE_DIR_NAME } from './constants';
import { getLoginCommand } from './commands/login';
import { getValidateCommand } from './commands/validate';
import { getWatchCommand } from './commands/watch';
import { getShowPanelCommand } from './commands/show-panel';
import { getShowConfigurationCommand } from './commands/show-configuration';
import { getBootstrapConfigurationCommand } from './commands/bootstrap-configuration';
import { getSynchronizeCommand } from './commands/synchronize';
import { getLogoutCommand } from './commands/logout';
import { getTrackCommand } from './commands/track';
import { RuntimeContext } from './utils/runtime-context';
import { SarifWatcher } from './utils/sarif-watcher';
import { PolicyPuller } from './utils/policy-puller';
import { getTooltipContentDefault } from './utils/tooltip';
import { getAuthenticator } from './utils/authentication';
import { getSynchronizer } from './utils/synchronization';
import { trackEvent, initTelemetry, closeTelemetry } from './utils/telemetry';
import logger from './utils/logger';
import globals from './utils/globals';
import { raiseError } from './utils/errors';
import { registerAnnotationSuppressionsCodeActionsProvider, registerFixCodeActionsProvider } from './core';
import type { ExtensionContext } from 'vscode';

let runtimeContext: RuntimeContext;

export async function activate(context: ExtensionContext): Promise<any> {
  return pRetry(async (attempt) => {
    try {
      await runActivation(context);
    } catch (err: any) {
      // Rethrow any errors as generic ones so pRetry reacts to it, because it ignores some types of errors as mentioned in the docs:
      // > It does not retry on most TypeError's, with the exception of network errors.
      throw new Error(err);
    }

    if (!globals.isActivated) {
      throw new Error(`Activation failed on ${attempt} attempt.`);
    }
  }, {
    retries: 10,
    factor: 1.2,
    minTimeout: 1000,
    maxTimeout: 5000,
    onFailedAttempt: (err) => {
      context.subscriptions.forEach((subscription) => subscription.dispose());
      logger.error(`Error activating extension`, err);
    },
  });
}

export async function deactivate() {
  logger.log('Deactivating extension...');

  await closeTelemetry();

  if (runtimeContext) {
    runtimeContext.dispose();
  }
}

async function runActivation(context: ExtensionContext) {
  globals.storagePath = normalize(join(context.extensionPath, STORAGE_DIR_NAME));
  logger.debug = globals.verbose;

  logger.log('Activating extension...');

  globals.isActivated = false;

  await globals.setDefaultOrigin();

  const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 25);
  statusBarItem.text = STATUS_BAR_TEXTS.DEFAULT;
  statusBarItem.tooltip = getTooltipContentDefault();
  statusBarItem.command = COMMANDS.SHOW_PANEL;
  statusBarItem.show();

  context.subscriptions.push(
    statusBarItem
  );

  runtimeContext = new RuntimeContext(
    context,
    new SarifWatcher(),
    undefined,
    undefined,
    undefined,
    statusBarItem,
  );

  await configureRuntimeContext(runtimeContext);

  globals.setRuntimeContext(runtimeContext);

  const commandLogin = commands.registerCommand(COMMANDS.LOGIN, getLoginCommand(runtimeContext));
  const commandLogout = commands.registerCommand(COMMANDS.LOGOUT, getLogoutCommand(runtimeContext));
  const commandValidate = commands.registerCommand(COMMANDS.VALIDATE, getValidateCommand(runtimeContext));
  const commandShowPanel = commands.registerCommand(COMMANDS.SHOW_PANEL, getShowPanelCommand());
  const commandShowConfiguration = commands.registerCommand(COMMANDS.SHOW_CONFIGURATION, getShowConfigurationCommand());
  const commandBootstrapConfiguration = commands.registerCommand(COMMANDS.BOOTSTRAP_CONFIGURATION, getBootstrapConfigurationCommand());
  const commandDownloadPolicy = commands.registerCommand(COMMANDS.SYNCHRONIZE, getSynchronizeCommand(runtimeContext));
  const commandWatch = commands.registerCommand(COMMANDS.WATCH, getWatchCommand(runtimeContext));
  const commandTrack = commands.registerCommand(COMMANDS.TRACK, getTrackCommand(runtimeContext));

  context.subscriptions.push(
    commandLogin,
    commandLogout,
    commandValidate,
    commandWatch,
    commandShowPanel,
    commandShowConfiguration,
    commandBootstrapConfiguration,
    commandDownloadPolicy,
    commandTrack
  );

  context.subscriptions.push(registerAnnotationSuppressionsCodeActionsProvider());
  context.subscriptions.push(registerFixCodeActionsProvider());

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
        await runtimeContext.refreshPolicyPuller();
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

      // When origin changes:
      // 1. Logout user from previous session.
      // 2. Create new authenticator and synchronizer with new origin.
      // 3. Propagate them to global context via runtimeContext.
      // 4. Run validation.
      if ((await globals.getUser()).isAuthenticated) {
        await commands.executeCommand(COMMANDS.LOGOUT, {
          originChanged: true,
        });
      }

      await configureRuntimeContext(runtimeContext);

      setupRemoteEventListeners(runtimeContext);

      await runtimeContext.refreshPolicyPuller();
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

    if (event.affectsConfiguration(SETTINGS.PROJECT_PATH)) {
      trackEvent('config/change', {
        status: 'success',
        name: SETTINGS.PROJECT,
        value: String(globals.project),
      });

      await commands.executeCommand(COMMANDS.VALIDATE);
    }

    if (event.affectsConfiguration(SETTINGS.RUN_PATH)) {
      trackEvent('config/change', {
        status: 'success',
        name: SETTINGS.RUN,
        value: String(globals.run),
      });

      await commands.executeCommand(COMMANDS.WATCH);
    }
  });

  const workspaceWatcher = workspace.onDidChangeWorkspaceFolders(async () => {
    trackEvent('workspace/change', {
      status: 'success',
      rootCount: workspace.workspaceFolders?.length ?? 0,
    });

    await runtimeContext.refreshPolicyPuller();
    await commands.executeCommand(COMMANDS.VALIDATE);
    await commands.executeCommand(COMMANDS.WATCH);
  });

  setupRemoteEventListeners(runtimeContext);

  context.subscriptions.push(
    configurationWatcher,
    workspaceWatcher
  );

  globals.isActivated = true;

  if (!globals.enabled) {
    return;
  }

  await initTelemetry();

  logger.log('Extension activated...', globals.asObject());

  // Defer initial validation so it doesn't block the activation.
  setTimeout(async () => {
    await runtimeContext.refreshPolicyPuller();
    await commands.executeCommand(COMMANDS.VALIDATE);
    await commands.executeCommand(COMMANDS.WATCH);
  }, 10);
}

async function configureRuntimeContext(runtimeContext: RuntimeContext) {
  try {
    const newAuthenticator = await getAuthenticator(globals.origin);
    const newSynchronizer = await getSynchronizer(globals.origin);
    const newPolicyPuller = new PolicyPuller(newSynchronizer);

    await runtimeContext.reconfigure(newPolicyPuller, newAuthenticator, newSynchronizer);
  } catch (err: any) {
    raiseError(`Failed to connect to given origin '${globals.origin}', please check your configuration. Error: ${err.message}`);
    runtimeContext.localOnly();
  }
}

function setupRemoteEventListeners(runtimeContext: RuntimeContext) {
  if (runtimeContext.isLocal) {
    return;
  }

  runtimeContext.authenticator.on('login', async (user) => {
    logger.log('EVENT:login', user, globals.isActivated);

    if (!globals.isActivated || !globals.enabled) {
      return;
    }

    await runtimeContext.refreshPolicyPuller();
    await commands.executeCommand(COMMANDS.VALIDATE);
  });

  runtimeContext.authenticator.on('logout', async () => {
    logger.log('EVENT:logout', globals.isActivated);

    if (!globals.isActivated || !globals.enabled) {
      return;
    }

    await runtimeContext.refreshPolicyPuller();
    await commands.executeCommand(COMMANDS.VALIDATE);
  });

  runtimeContext.synchronizer.on('synchronize', async (policy) => {
    logger.log('EVENT:synchronize', policy, globals.isActivated);

    if (!globals.isActivated || !globals.enabled) {
      return;
    }

    await runtimeContext.refreshPolicyPuller();
    await commands.executeCommand(COMMANDS.VALIDATE);
  });
}
