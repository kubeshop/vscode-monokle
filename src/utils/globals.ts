import { workspace } from 'vscode';
import { DEFAULT_REMOTE_POLICY_URL, SETTINGS } from '../constants';

class Globals {
  private _storagePath: string = '';
  private _isAuthenticated: boolean = false;

  get storagePath() {
    return this._storagePath;
  }

  set storagePath(value) {
    this._storagePath = value;
  }

  get isAuthenticated() {
    return this._isAuthenticated;
  }

  set isAuthenticated(value) {
    this._isAuthenticated = value;
  }

  get configurationPath() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.CONFIGURATION_PATH);
  }

  get remotePolicyUrl() {
    return process.env.MONOKLE_TEST_SERVER_URL ?? this.overwriteRemotePolicyUrl ?? DEFAULT_REMOTE_POLICY_URL;
  }

  get overwriteRemotePolicyUrl() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.OVERWRITE_REMOTE_POLICY_URL);
  }

  get enabled() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<boolean>(SETTINGS.ENABLED);
  }

  get verbose() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<boolean>(SETTINGS.VERBOSE);
  }

  asObject() {
    return {
      storagePath: this.storagePath,
      isAuthenticated: this.isAuthenticated,
      configurationPath: this.configurationPath,
      remotePolicyUrl: this.remotePolicyUrl,
      overwriteRemotePolicyUrl: this.overwriteRemotePolicyUrl,
      enabled: this.enabled,
      verbose: this.verbose,
    };
  }
}

const globalsInstance = new Globals();

export default globalsInstance;
