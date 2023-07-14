import { getWorkspaceFolders } from './workspace';
import { getRepoRemoteData } from './git';
import { getPolicy, getUser } from './api';
import { removeConfig, saveConfig } from './validation';
import { REMOTE_POLICY_FILE_SUFFIX } from '../constants';
import logger from './logger';
import globals from './globals';
import type { Folder } from './workspace';

const REFETCH_POLICY_INTERVAL_MS = 1000 * 30;

export class PolicyPuller {

  private _url = '';
  private _isPulling = false;
  private _pullPromise: Promise<void> | undefined;
  private _policyFetcherId: NodeJS.Timer | undefined;

  constructor(url: string) {
    this.url = url;
  }

  get url() {
    return this._url;
  }

  set url(value: string) {
    this._url = value;
  }

  async refresh() {
    if (!this._url) {
      return this.clear();
    }

    await this.pull();
    return this.initializePolicyFetcher();
  }

  async dispose() {
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

  private async fetchPolicyFiles(roots: Folder[]) {
    const userData = await getUser();

    logger.log('userData', userData);

    if (!userData) {
      return;
    }

    for (const folder of roots) {
      const repoData = await getRepoRemoteData(folder.uri.fsPath);
      if (!repoData) {
        continue;
      }

      const repoMainProject = userData.data.me.projects.find(project => {
        return project.project.repositories.find(repo => repo.owner === repoData.owner && repo.name === repoData.name && repo.prChecks);
      });

      const repoFirstProject = userData.data.me.projects.find(project => {
        return project.project.repositories.find(repo => repo.owner === repoData.owner && repo.name === repoData.name);
      });

      const repoProject = repoMainProject ?? repoFirstProject;

      logger.log('repoId', folder.name, repoData, repoMainProject, repoFirstProject);

      if (!repoProject) {
        continue;
      }

      const repoPolicy = await getPolicy(repoProject.project.slug);

      logger.log('repoPolicy', repoPolicy);

      if (!repoPolicy) {
        continue;
      }

      const commentBefore = [
        ' This is remote validation configuration downloaded from Kubeshop Policy Server.',
        ' To adjust it, log into your Kubeshop Policy Server and edit change XXX project policy.',
      ].join('\n');

      saveConfig(
        repoPolicy.data.getProject.policy.json,
        globals.storagePath,
        `${folder.id}${REMOTE_POLICY_FILE_SUFFIX}`,
        {commentBefore}
      );
    }

    this._isPulling = false;
    this._pullPromise = undefined;
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

  private async clear() {
    if (this._isPulling) {
      await this._pullPromise;
    }

    if (this._policyFetcherId) {
      clearInterval(this._policyFetcherId);
      this._policyFetcherId = undefined;
    }

    const roots = getWorkspaceFolders();
    for (const folder of roots) {
      await removeConfig(
        globals.storagePath,
        `${folder.id}${REMOTE_POLICY_FILE_SUFFIX}`,
      );
    }
  }
}
