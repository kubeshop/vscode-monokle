import { workspace } from 'vscode';
import { DEFAULT_REMOTE_POLICY_URL, SETTINGS } from '../constants';
import { getStoreAuthSync } from './store';

class Globals {
  private _storagePath: string = '';
  private _activeUser: any = {};

  get storagePath() {
    return this._storagePath;
  }

  set storagePath(value) {
    this._storagePath = value;
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

  get user() {
    return {
      isAuthenticated: Boolean(this._activeUser.auth?.accessToken),
      email: this._activeUser.auth?.email,
      accessToken: this._activeUser.auth?.accessToken,
    };
  }

  refetchUser() {
    this._activeUser = getStoreAuthSync() ?? {};
  }

  asObject() {
    return {
      storagePath: this.storagePath,
      configurationPath: this.configurationPath,
      remotePolicyUrl: this.remotePolicyUrl,
      overwriteRemotePolicyUrl: this.overwriteRemotePolicyUrl,
      enabled: this.enabled,
      verbose: this.verbose,
      user: this.user,
    };
  }
}

const globalsInstance = new Globals();

globalsInstance.refetchUser();

export default globalsInstance;
