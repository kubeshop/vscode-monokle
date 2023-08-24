import { rm } from 'fs/promises';
import { getWorkspaceFolders } from './workspace';
import { getSynchronizer } from './synchronization';
import { trackEvent } from './telemetry';
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
    const user = await globals.getUser();

    if (!user.isAuthenticated) {
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
    const user = await globals.getUser();

    for (const folder of roots) {

      trackEvent('policy/synchronize', {
        status: 'started',
      });

      try {
        const policy = await this._synchronizer.synchronize(folder.uri.fsPath, user.token);
        logger.log('fetchPolicyFiles', policy);
        globals.setFolderStatus(folder);

        trackEvent('policy/synchronize', {
          status: 'success',
        });
      } catch (error) {
        const errorDetails = this.getErrorDetails(error);

        logger.error('fetchPolicyFiles', error, errorDetails);

        if (errorDetails.type === 'NO_PROJECT' || errorDetails.type === 'NO_POLICY') {
          await this.removeOutdatedPolicy(folder.uri.fsPath);
        }

        globals.setFolderStatus(folder, errorDetails.message);

        trackEvent('policy/synchronize', {
          status: 'failure',
          errorCode: errorDetails.type,
          error: error.msg,
        });
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

    if (message.includes('is not a git repository')) {
      type = 'NO_REPO';
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

  private async removeOutdatedPolicy(path: string) {
    try {
      const outdatedPolicy = await this._synchronizer.getPolicy(path);

      if (outdatedPolicy.path) {
        await rm(outdatedPolicy.path, { force: true });
      }
    } catch (err) {
      logger.error('removeOutdatedPolicy', err);
    }
  }
}
