import { ok, deepEqual } from 'assert';
import { workspace, commands, ConfigurationTarget } from 'vscode';
import { join } from 'path';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import { getWorkspaceConfig, getWorkspaceFolders } from '../../utils/workspace';
import { doSetup, doSuiteSetup, doSuiteTeardown } from '../helpers/suite';
import { DEFAULT_POLICY } from '../helpers/server';
import { COMMANDS } from '../../constants';
import type { Folder, WorkspaceFolderConfig } from '../../utils/workspace';

suite(`Policies - Remote: ${process.env.ROOT_PATH}`, () => {
  suiteSetup(async () => {
    await doSuiteSetup();
  });

  setup(async () => {
    await workspace.getConfiguration('monokle').update('verbose', true, ConfigurationTarget.Workspace);
    await workspace.getConfiguration('monokle').update('enabled', false, ConfigurationTarget.Workspace);
    await doSetup();
    await rm(join(process.env.MONOKLE_TEST_CONFIG_PATH, 'github-kubeshop-monokle-demo.policy.yaml'), { force: true });
  });

  suiteTeardown(async () => {
    await doSuiteTeardown();
  });

  test('Fetches policy from remote API when authenticated', async function () {
    const folders = getWorkspaceFolders();
    const folder = folders[0];
    const config = await getWorkspaceConfig(folder);

    ok(config.isValid === false);

    await workspace.getConfiguration('monokle').update('enabled', true, ConfigurationTarget.Workspace);

    const configRemote = await waitForValidationConfig(folder, 10000);

    ok(configRemote);
    ok(configRemote.isValid);
    deepEqual(configRemote.config, DEFAULT_POLICY);
  }).timeout(15000);

  test('Refetches policy from remote API when authenticated and synchronize command run', async function () {
    const folders = getWorkspaceFolders();
    const folder = folders[0];
    const config = await getWorkspaceConfig(folder);

    ok(config.isValid === false);

    await workspace.getConfiguration('monokle').update('enabled', true, ConfigurationTarget.Workspace);

    const configRemote = await waitForValidationConfig(folder, 10000);

    ok(configRemote.isValid);
    ok(configRemote.path);

    await rm(configRemote.path);

    ok(existsSync(configRemote.path) === false);

    await commands.executeCommand(COMMANDS.SYNCHRONIZE);

    const configNew = await waitForValidationConfig(folder, 10000);

    deepEqual(configNew.config, DEFAULT_POLICY);
  }).timeout(25000);
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

