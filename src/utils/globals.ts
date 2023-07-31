import { workspace } from 'vscode';
import { DEFAULT_REMOTE_POLICY_URL, SETTINGS } from '../constants';
import { getStoreAuthSync, setStoreAuth } from './store';
import { refreshAuthFlow } from './device-flow';

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
      isAuthenticated: Boolean(this._activeUser.auth?.token.access_token),
      email: this._activeUser.auth?.email,
      accessToken: this._activeUser.auth?.token.access_token,
    };
  }

  refetchUser() {
    this._activeUser = getStoreAuthSync() ?? {};
  }

  async refreshUserToken() {
    if (!this._activeUser) {
      return;
    }

    const expiresAt = this._activeUser.auth?.accessTokenData?.expires_at;
    if (!expiresAt) {
      return;
    }

    const now = new Date();
    const expiresAtDate = new Date(expiresAt * 1000);
    const diffMinutes = expiresAtDate.getTime() - now.getTime();

    if (diffMinutes < 5) {
      const refreshToken = this._activeUser.auth?.accessTokenData?.refresh_token;
      if (!refreshToken) {
        return;
      }

      const token = await refreshAuthFlow(refreshToken);
      await setStoreAuth(this._activeUser.auth.email, token);
      this.refetchUser();
    }
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
