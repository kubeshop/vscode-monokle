import normalizeUrl from 'normalize-url';
import { workspace } from 'vscode';
import { SETTINGS } from '../constants';
import { Folder } from './workspace';
import { RuntimeContext } from './runtime-context';
import logger from './logger';
import type { Authenticator } from './authentication';
import { SuppressionPermissions } from '../core/suppressions/suppressions';

export type FolderStatus = {
  valid: boolean;
  error?: string;
};

class Globals {
  private _storagePath: string = '';
  private _isActivated: boolean = false;
  private _defaultOrigin: string = '';
  private _statuses: Record<string, FolderStatus> = {};
  private _runtimeContext: RuntimeContext = null;

  get storagePath() {
    return this._storagePath;
  }

  set storagePath(value) {
    this._storagePath = value;
  }

  get isActivated() {
    return this._isActivated;
  }

  set isActivated(value) {
    this._isActivated = value;
  }

  get configurationPath() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.CONFIGURATION_PATH);
  }

  get origin() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.ORIGIN) || this._defaultOrigin;
  }

  get originFormatted() {
    return normalizeUrl(this.origin, {
      stripHash: true,
      stripProtocol: true,
      stripWWW: true,
      removeTrailingSlash: true,
    });
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

  get project() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.PROJECT);
  }

  get run() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.RUN);
  }

  get automaticallyOpenPanel() {
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.AUTOMATICALLY_OPEN_PANEL);
  }

  async setDefaultOrigin() {
    const {DEFAULT_ORIGIN} = await import('@monokle/synchronizer');
    this._defaultOrigin = DEFAULT_ORIGIN;
  }

  async getUser(): Promise<Authenticator['user']> {
    if (this._runtimeContext.isLocal) {
      return {
        isAuthenticated: false,
      } as Authenticator['user'];
    }

    if (!this._runtimeContext?.authenticator) {
      throw new Error('Authenticator not initialized for globals.');
    }

    return this._runtimeContext.authenticator.getUser();
  }

  getRemoteProjectName(path: string) {
    if (this._runtimeContext.isLocal || !this._runtimeContext.authenticator.user.isAuthenticated) {
      return '';
    }

    return (this._runtimeContext?.synchronizer.getProjectInfo(path, this.project ?? undefined) || {}).name ?? '';
  }

  getRemotePolicy(path: string) {
    if (this._runtimeContext.isLocal || !this._runtimeContext.authenticator.user.isAuthenticated) {
      return {
        valid: false,
        path: '',
        policy: {},
      };
    }

    return this._runtimeContext?.synchronizer.getProjectPolicy(path, this.project ?? undefined);
  }

  getSuppressions(path: string) {
    if (this._runtimeContext.isLocal || !this._runtimeContext.authenticator.user.isAuthenticated) {
      return [];
    }

    return this._runtimeContext?.synchronizer.getRepositorySuppressions(path, this.project ?? undefined);
  }

  getProjectPermissions(path: string): SuppressionPermissions {
    if (this._runtimeContext.isLocal || !this._runtimeContext.authenticator.user.isAuthenticated) {
      return 'NONE';
    }

    const permissions = this._runtimeContext?.synchronizer.getProjectPermissions(path, this.project ?? undefined);

    if (!permissions) {
      return 'NONE';
    }

    return permissions.repositories.write ? 'ADD' : 'REQUEST';
  }

  getFolderStatus(folder: Folder) {
    return this._statuses[folder.id];
  }

  setFolderStatus(folder: Folder, error?: string) {
    this._statuses[folder.id] = {
      valid: !error,
      error,
    };
  }

  async forceRefreshToken() {
    if (this._runtimeContext.isLocal) {
      return;
    }

    if (!this._runtimeContext?.authenticator) {
      throw new Error('Authenticator not initialized for globals.');
    }

    return this._runtimeContext.authenticator.refreshToken(true);
  }

  setRuntimeContext(value: RuntimeContext) {
    this._runtimeContext = value;
  }

  asObject() {
    return {
      storagePath: this.storagePath,
      configurationPath: this.configurationPath,
      origin: this.origin,
      defaultOrigin: this._defaultOrigin,
      enabled: this.enabled,
      verbose: this.verbose,
      isActivated: this.isActivated,
    };
  }
}

const globalsInstance = new Globals();

export default globalsInstance;
