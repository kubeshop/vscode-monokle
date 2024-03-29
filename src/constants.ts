export const STORAGE_DIR_NAME = '.monokle';

export const DEFAULT_CONFIG_FILE_NAME = 'monokle.validation.yaml';

export const VALIDATION_FILE_SUFFIX = '.validation.json';

export const TMP_POLICY_FILE_SUFFIX = '.config.tmp.yaml';

export const DEFAULT_REMOTE_POLICY_URL = 'https://dev.monokle.com';

export const SETTINGS = {
  NAMESPACE: 'monokle',
  ENABLED: 'enabled',
  CONFIGURATION_PATH: 'configurationPath',
  VERBOSE: 'verbose',
  TELEMETRY_ENABLED: 'telemetryEnabled',
  ORIGIN: 'origin',
  PROJECT: 'project',
  RUN: 'run',
  AUTOMATICALLY_OPEN_PANEL: 'automaticallyOpenPanel',
  ENABLED_PATH: 'monokle.enabled',
  CONFIGURATION_PATH_PATH: 'monokle.configurationPath',
  VERBOSE_PATH: 'monokle.verbose',
  TELEMETRY_ENABLED_PATH: 'monokle.telemetryEnabled',
  ORIGIN_PATH: 'monokle.origin',
  PROJECT_PATH: 'monokle.project',
  RUN_PATH: 'monokle.run',
  AUTOMATICALLY_OPEN_PANEL_PATH: 'monokle.automaticallyOpenPanel',
};

export const COMMANDS = {
  LOGIN: 'monokle.login',
  LOGOUT: 'monokle.logout',
  VALIDATE: 'monokle.validate',
  SHOW_PANEL: 'monokle.showPanel',
  SHOW_CONFIGURATION: 'monokle.showConfiguration',
  BOOTSTRAP_CONFIGURATION: 'monokle.bootstrapConfiguration',
  SYNCHRONIZE: 'monokle.synchronize',
  WATCH: 'monokle.watch',
  TRACK: 'monokle.track',
  RAISE_AUTHENTICATION_ERROR: 'monokle.raiseAuthenticationError',
  RUN_COMMANDS: 'monokle.runCommands',
  SUPPRESS: 'monokle.suppress',
};

export const COMMAND_NAMES = {
  LOGIN: 'Monokle: Login',
  LOGOUT: 'Monokle: Logout',
  VALIDATE: 'Monokle: Validate',
  SHOW_PANEL: 'Monokle: Show validation panel',
  SHOW_CONFIGURATION: 'Monokle: Show configuration',
  BOOTSTRAP_CONFIGURATION: 'Monokle: Bootstrap configuration',
  SYNCHRONIZE: 'Monokle: Synchronize',
  WATCH: 'Monokle: Watch',
};

export const STATUS_BAR_TEXTS = {
  DEFAULT: '$(circle-outline) Monokle',
  ERROR: '$(warning) Monokle',
};

export enum RUN_OPTIONS {
  onSave = 'onSave',
  onType = 'onType',
};
