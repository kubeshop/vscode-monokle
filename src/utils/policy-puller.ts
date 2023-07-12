import { getWorkspaceFolders } from './workspace';
import { getRepoId } from './git';
import logger from './logger';
import type { Folder } from './workspace';

export class PolicyPuller {

  private _url = '';
  private _isPulling = false;
  private _pullPromise: Promise<void> | undefined;
  private _policyRefetcher: () => {} | undefined;

  constructor(url: string) {
    this.url = url;
  }

  get url() {
    return this._url;
  }

  set url(value: string) {
    this._url = value;

    if (!this._url) {
      // clear existing policy files
      return;
    }

    this._fetchPolicyFiles(getWorkspaceFolders());
    // fetch policy files
    // initialize puller interval
  }

  getPolicyForFolder(_folder: Folder) {
    // return policy for folder
  }

  pull() {
    if (this._isPulling) {
      return this._pullPromise;
    }

    this._isPulling = true;
    this._pullPromise = new Promise((_resolve, _reject) => {});

    return this._pullPromise;
  }

  private async _fetchPolicyFiles(roots: Folder[]) {
    for (const folder of roots) {
      const repoId = await getRepoId(folder.uri.fsPath);
      logger.log('repoId', folder.name, repoId);
      // query graphQl API
    }
  }
}