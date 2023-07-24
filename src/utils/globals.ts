import { workspace } from 'vscode';
import { SETTINGS } from '../constants';

class Globals {
  private _storagePath: string = '';

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
    return workspace.getConfiguration(SETTINGS.NAMESPACE).get<string>(SETTINGS.REMOTE_POLICY_URL);
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
      configurationPath: this.configurationPath,
      remotePolicyUrl: this.remotePolicyUrl,
      enabled: this.enabled,
      verbose: this.verbose,
    };
  }
}

const globalsInstance = new Globals();

export default globalsInstance;