export const STORAGE_DIR_NAME = '.monokle';

export const DEFAULT_CONFIG_FILE_NAME = 'monokle.validation.yaml';

export const VALIDATION_FILE_SUFFIX = '.validation.json';

export const TMP_POLICY_FILE_SUFFIX = '.config.tmp.yaml';

export const REMOTE_POLICY_FILE_SUFFIX = '.config.remote.yaml';

export const SETTINGS = {
  NAMESPACE: 'monokle',
  ENABLED: 'enabled',
  CONFIGURATION_PATH: 'configurationPath',
  VERBOSE: 'verbose',
  REMOTE_POLICY_URL: 'remotePolicyUrl',
  ENABLED_PATH: 'monokle.enabled',
  CONFIGURATION_PATH_PATH: 'monokle.configurationPath',
  VERBOSE_PATH: 'monokle.verbose',
  REMOTE_POLICY_URL_PATH: 'monokle.remotePolicyUrl',
};

export const COMMANDS = {
  VALIDATE: 'monokle.validate',
  SHOW_PANEL: 'monokle.showPanel',
  SHOW_CONFIGURATION: 'monokle.showConfiguration',
  BOOTSTRAP_CONFIGURATION: 'monokle.bootstrapConfiguration',
  WATCH: 'monokle.watch',
};

export const STATUS_BAR_TEXTS = {
  DEFAULT: '🔍 Monokle',
  VALIDATING: '🤔 Validating...',
};
