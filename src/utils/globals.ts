import { workspace } from 'vscode';
import { SETTINGS } from '../constants';
import { getAuthenticator } from './authentication';
import { getSynchronizer } from './synchronization';
import { Folder } from './workspace';
import { RuntimeContext } from './runtime-context';

export type FolderStatus = {
  valid: boolean;
  error?: string;
};

class Globals {
  private _storagePath: string = '';
  private statuses: Record<string, FolderStatus> = {};
  private _authenticator: Awaited<ReturnType<typeof getAuthenticator>> = null;
  private _synchronizer: Awaited<ReturnType<typeof getSynchronizer>> = null;
  private _defaultOrigin: string = '';

  get storagePath() {
    return this._storagePath;
  }

  set storagePath(value) {
    this._storagePath = value;
  }

  get configurationPath() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.CONFIGURATION_PATH);
  }

  get remotePolicyUrl() { // @TODO this should be dropped
    return process.env.MONOKLE_TEST_SERVER_URL ?? this.origin ?? '';
  }

  get origin() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.ORIGIN) || this._defaultOrigin;
  }

  get enabled() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<boolean>(SETTINGS.ENABLED);
  }

  get verbose() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<boolean>(SETTINGS.VERBOSE);
  }

  get telemetryEnabled() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<boolean>(SETTINGS.TELEMETRY_ENABLED);
  }

  set defaultOrigin(value: string) {
    this._defaultOrigin = value;
  }

  async getUser(): Promise<Awaited<ReturnType<typeof getAuthenticator>>['user']> {
    if (!this._authenticator) {
      throw new Error('Authenticator not initialized for globals.');
    }

    return this._authenticator.getUser();
  }

  async getRemoteProjectName(path: string) {
    if (!this._authenticator) {
      throw new Error('Authenticator not initialized for globals.');
    }

    if (!this._synchronizer) {
      throw new Error('Synchronizer not initialized for globals.');
    }

    try {
      const user = await this._authenticator.getUser();
      const projectInfo = await this._synchronizer.getProjectInfo(path, user.tokenInfo);
      return projectInfo?.name ?? '';
    } catch (err) {
      return '';
    }
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

  async forceRefreshToken() {
    if (!this._authenticator) {
      throw new Error('Authenticator not initialized for globals.');
    }

    return this._authenticator.refreshToken(true);
  }

  asObject() {
    return {
      storagePath: this.storagePath,
      configurationPath: this.configurationPath,
      remotePolicyUrl: this.remotePolicyUrl,
      origin: this.origin,
      enabled: this.enabled,
      verbose: this.verbose,
    };
  }
}

const globalsInstance = new Globals();

export default globalsInstance;
