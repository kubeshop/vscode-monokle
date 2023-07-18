import * as assert from 'assert';
import simpleGit from 'simple-git';
import { workspace, ConfigurationTarget } from 'vscode';
import { getWorkspaceConfig, getWorkspaceFolders } from '../../utils/workspace';
import { doSetup, doSuiteSetup, doSuiteTeardown } from '../helpers/suite';
import { DEFAULT_POLICY } from '../helpers/server';
import type { Folder, WorkspaceFolderConfig } from '../../utils/workspace';

suite(`Policies - Remote: ${process.env.ROOT_PATH}`, () => {
  suiteSetup(async () => {
    await doSuiteSetup();
  });

  setup(async () => {
    await doSetup();
  });

  suiteTeardown(async () => {
    await doSuiteTeardown();
  });

  test('Fetches policy from remote API when URL set', async function () {
    const folders = getWorkspaceFolders();
    const folder = folders[0];

    const git = simpleGit(folder.uri.fsPath);
    await git.init().addRemote('origin', 'git@github.com:kubeshop/monokle-demo.git');

    const remotes = await git.getRemotes(true);

    assert.ok(remotes.length > 0);
    assert.ok(remotes[0].name === 'origin');
    assert.ok(remotes[0].refs.fetch.includes('kubeshop/monokle-demo'));

    await workspace.getConfiguration('monokle').update('enabled', true, ConfigurationTarget.Workspace);

    const config = await waitForValidationConfig(folder, 10000);

    assert.ok(config);
    assert.ok(config.isValid);
    assert.deepEqual(config.config, DEFAULT_POLICY);
  }).timeout(15000);
});

async function waitForValidationConfig(workspaceFolder: Folder, timeoutMs?: number): Promise<WorkspaceFolderConfig> {
  return new Promise((res) => {
    let timeoutId = null;
    let result = null;

    const intervalId = setInterval(async () => {
      result = await getWorkspaceConfig(workspaceFolder);

      if (result && result.isValid) {
        clearInterval(intervalId);
        timeoutId && clearTimeout(timeoutId);
        res(result);
      }
    }, 250);

    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        res(result);
      }, timeoutMs);
    }
  });
}