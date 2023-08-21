import { getWorkspaceFolders } from './workspace';
import { getSynchronizer } from './synchronization';
import logger from './logger';
import globals from './globals';
import type { Folder } from './workspace';

const REFETCH_POLICY_INTERVAL_MS = 1000 * 30;

export class PolicyPuller {

  private _isPulling = false;
  private _pullPromise: Promise<void> | undefined;
  private _policyFetcherId: NodeJS.Timer | undefined;

  constructor(
    private _synchronizer: Awaited<ReturnType<typeof getSynchronizer>>
  ) {}

  async refresh() {
    if (!globals.user.isAuthenticated) {
      return this.dispose();
    }

    await this.pull();
    return this.initializePolicyFetcher();
  }

  async dispose() {
    if (this._isPulling) {
      await this._pullPromise;
    }

    if (this._policyFetcherId) {
      clearInterval(this._policyFetcherId);
      this._policyFetcherId = undefined;
    }
  }

  private async pull() {
    if (this._isPulling) {
      return this._pullPromise;
    }

    this._isPulling = true;
    this._pullPromise = this.fetchPolicyFiles(getWorkspaceFolders());

    return this._pullPromise;
  }

  private async initializePolicyFetcher() {
    if (this._isPulling) {
      await this._pullPromise;
    }

    if (this._policyFetcherId) {
      clearInterval(this._policyFetcherId);
      this._policyFetcherId = undefined;
    }

    this._policyFetcherId = setInterval(async () => {
      this.pull();
    }, REFETCH_POLICY_INTERVAL_MS);
  }

  private async fetchPolicyFiles(roots: Folder[]) {
    for (const folder of roots) {
      try {
        const policy = await this._synchronizer.synchronize(folder.uri.fsPath, globals.user.token);
        logger.log('fetchPolicyFiles', policy);
      } catch (error) {
        logger.error(error);
        // @TODO update status bar
      }
    }

    this._isPulling = false;
    this._pullPromise = undefined;
  }
}
