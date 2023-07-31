export const STORAGE_DIR_NAME = '.monokle';

export const DEFAULT_CONFIG_FILE_NAME = 'monokle.validation.yaml';

export const VALIDATION_FILE_SUFFIX = '.validation.json';

export const TMP_POLICY_FILE_SUFFIX = '.config.tmp.yaml';

export const REMOTE_POLICY_FILE_SUFFIX = '.config.remote.yaml';

export const DEFAULT_REMOTE_POLICY_URL = 'https://api.monokle.com';

export const DEVICE_FLOW_CLIENT_ID = 'monokle-cli';

export const SETTINGS = {
  NAMESPACE: 'monokle',
  ENABLED: 'enabled',
  CONFIGURATION_PATH: 'configurationPath',
  VERBOSE: 'verbose',
  OVERWRITE_REMOTE_POLICY_URL: 'overwriteRemotePolicyUrl',
  ENABLED_PATH: 'monokle.enabled',
  CONFIGURATION_PATH_PATH: 'monokle.configurationPath',
  VERBOSE_PATH: 'monokle.verbose',
  OVERWRITE_REMOTE_POLICY_URL_PATH: 'monokle.overwriteRemotePolicyUrl',
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
};

export const STATUS_BAR_TEXTS = {
  DEFAULT: '🔍 Monokle',
  VALIDATING: '🤔 Validating...',
};
