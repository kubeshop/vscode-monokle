import { workspace } from 'vscode';
import { DEFAULT_REMOTE_POLICY_URL, SETTINGS } from '../constants';
import { getAuthenticator } from './authentication';
import { getSynchronizer } from './synchronization';
import { Folder } from './workspace';

export type FolderStatus = {
  valid: boolean;
  error?: string;
};

class Globals {
  private _storagePath: string = '';
  private statuses: Record<string, FolderStatus> = {};
  private _authenticator: Awaited<ReturnType<typeof getAuthenticator>> = null;
  private _synchronizer: Awaited<ReturnType<typeof getSynchronizer>> = null;

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

  get telemetryEnabled() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<boolean>(SETTINGS.VERBOSE);
  }

  get user(): Awaited<ReturnType<typeof getAuthenticator>>['user'] {
    if (!this._authenticator) {
      throw new Error('Authenticator not initialized for globals.');
    }

    return this._authenticator.user;
  }

  async getRemotePolicy(path: string) {
    if (!this._synchronizer) {
      throw new Error('Synchronizer not initialized for globals.');
    }

    try {
      const policy = await this._synchronizer.getPolicy(path);
      return policy;
    } catch (err) {
      return {
        valid: false,
        path: '',
        policy: {},
      };
    }
  }

  getFolderStatus(folder: Folder) {
    return this.statuses[folder.id];
  }

  setFolderStatus(folder: Folder, error?: string) {
    this.statuses[folder.id] = {
      valid: !error,
      error,
    };
  }

  setAuthenticator(authenticator: Awaited<ReturnType<typeof getAuthenticator>>) {
    this._authenticator = authenticator;
  }

  setSynchronizer(synchronizer: Awaited<ReturnType<typeof getSynchronizer>>) {
    this._synchronizer = synchronizer;
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

export default globalsInstance;
