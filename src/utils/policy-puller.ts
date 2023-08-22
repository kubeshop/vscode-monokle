import { rm } from 'fs/promises';
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
        globals.setFolderStatus(folder);
      } catch (error) {
        const errorDetails = this.getErrorDetails(error);

        logger.error('fetchPolicyFiles', error, errorDetails);

        if (errorDetails.type === 'NO_PROJECT' || errorDetails.type === 'NO_POLICY') {
          const outdatedPolicy = await this._synchronizer.getPolicy(folder.uri.fsPath);

          if (outdatedPolicy.path) {
            await rm(outdatedPolicy.path, { force: true });
          }
        }

        globals.setFolderStatus(folder, errorDetails.message);
      }
    }

    this._isPulling = false;
    this._pullPromise = undefined;
  }

  private getErrorDetails(err: any) {
    const message = err.message || '';

    let type = 'UNKNOWN';

    if (message.length === 0) {
      return {
        type,
        message: ''
      };
    }

    if (message.includes('Cannot fetch user data')) {
      type = 'NO_USER';
    }

    if (message.includes('does not belong to any project')) {
      type = 'NO_PROJECT';
    }

    if (message.includes('does not have policy defined')) {
      type = 'NO_POLICY';
    }

    return {
      type,
      message: `${type}: ${message}`
    };
  }
}
