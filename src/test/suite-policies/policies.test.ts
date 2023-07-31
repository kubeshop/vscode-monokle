import { simpleGit } from 'simple-git';
import { ok, deepEqual } from 'assert';
import { workspace, window, commands, ConfigurationTarget } from 'vscode';
import { spy } from 'sinon';
import { join } from 'path';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import { getWorkspaceConfig, getWorkspaceFolders } from '../../utils/workspace';
import { doSetup, doSuiteSetup, doSuiteTeardown } from '../helpers/suite';
import { DEFAULT_POLICY } from '../helpers/server';
import type { SinonSpy } from 'sinon';
import type { Folder, WorkspaceFolderConfig } from '../../utils/workspace';
import { COMMANDS } from '../../constants';
import { getStoreAuth } from '../../utils/store';

suite(`Policies - Remote: ${process.env.ROOT_PATH}`, () => {
  let errorSpy: SinonSpy;

  suiteSetup(async () => {
    await doSuiteSetup();
  });

  setup(async () => {
    await workspace.getConfiguration('monokle').update('enabled', false, ConfigurationTarget.Workspace);
    await doSetup();
  });

  teardown(async () => {
    if (errorSpy) {
      errorSpy.restore();
    }
  });

  suiteTeardown(async () => {
    await doSuiteTeardown();
  });

  // @TODO
  // Since test is executed in a repo (so one of the parents is still git repo)
  // we need to find a way to fake git checking function to run it. It will require
  // a bit of rework of utils/git.ts.
  // test('Shows error notification when folder not a git repo', async () => {
  //   const errorSpy = spy(window, 'showErrorMessage');

  //   const folders = getWorkspaceFolders();

  //   await workspace.getConfiguration('monokle').update('enabled', true, ConfigurationTarget.Workspace);
  //   await waitForSpyCall(errorSpy, 10 * 1000);

  //   ok(errorSpy.called);
  //   ok(`${errorSpy.args[0]}`.includes('folder is not a git repository'));
  // }).timeout(15000);

  test('Shows error notification when folder does not belong to a project', async () => {
    errorSpy = spy(window, 'showErrorMessage');

    const folders = getWorkspaceFolders();
    const folder = folders[0];

    await removeGitDir(folder.uri.fsPath);

    const git = simpleGit(folder.uri.fsPath);
    await git.init().addRemote('origin', 'git@github.com:kubeshop/monokle.git');

    await workspace.getConfiguration('monokle').update('enabled', true, ConfigurationTarget.Workspace);
    await waitForSpyCall(errorSpy, 10 * 1000);

    ok(errorSpy.called);
    ok(`${errorSpy.args[0]}`.includes('repository does not belong to any project'));
  });

  test('Fetches policy from remote API when authenticated', async function () {
    const folders = getWorkspaceFolders();
    const folder = folders[0];

    await removeGitDir(folder.uri.fsPath);

    const git = simpleGit(folder.uri.fsPath);
    await git.init().addRemote('origin', 'git@github.com:kubeshop/monokle-demo.git');

    const remotes = await git.getRemotes(true);

    ok(remotes.length > 0);
    ok(remotes[0].name === 'origin');
    ok(remotes[0].refs.fetch.includes('kubeshop/monokle-demo'));

    await workspace.getConfiguration('monokle').update('enabled', true, ConfigurationTarget.Workspace);

    const config = await waitForValidationConfig(folder, 10000);

    ok(config);
    ok(config.isValid);
    deepEqual(config.config, DEFAULT_POLICY);
  }).timeout(15000);

  test('Refetches policy from remote API when authenticated and synchronize command run', async function () {
    const folders = getWorkspaceFolders();
    const folder = folders[0];

    await removeGitDir(folder.uri.fsPath);

    const git = simpleGit(folder.uri.fsPath);
    await git.init().addRemote('origin', 'git@github.com:kubeshop/monokle-demo.git');

    const remotes = await git.getRemotes(true);

    ok(remotes.length > 0);
    ok(remotes[0].name === 'origin');
    ok(remotes[0].refs.fetch.includes('kubeshop/monokle-demo'));

    await workspace.getConfiguration('monokle').update('enabled', true, ConfigurationTarget.Workspace);

    const config = await waitForValidationConfig(folder, 10000);

    ok(config);
    ok(config.path);

    await rm(config.path);

    ok(existsSync(config.path) === false);

    await commands.executeCommand(COMMANDS.SYNCHRONIZE);

    const configNew = await waitForValidationConfig(folder, 10000);

    deepEqual(configNew.config, DEFAULT_POLICY);
  }).timeout(25000);

  test('Logouts with logout command', async () => {
    await workspace.getConfiguration('monokle').update('enabled', true, ConfigurationTarget.Workspace);

    const userData = await getStoreAuth();

    ok(userData.auth.email);
    ok(userData.auth.token.access_token);

    await commands.executeCommand(COMMANDS.LOGOUT);

    const userDataEmpty = await getStoreAuth();

    ok(userDataEmpty?.auth?.email === undefined);
    ok(userDataEmpty?.auth?.token.access_token === undefined);
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

async function waitForSpyCall(spy: SinonSpy, timeoutMs?: number): Promise<boolean> {
  return new Promise((res) => {
    let timeoutId = null;

    const intervalId = setInterval(async () => {
      if (spy.called) {
        clearInterval(intervalId);
        timeoutId && clearTimeout(timeoutId);
        res(true);
      }
    }, 250);

    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        res(false);
      }, timeoutMs);
    }
  });
}

async function removeGitDir(path: string): Promise<boolean> {
  try {
    await rm(join(path, '.git'), { recursive: true });
    return true;
  } catch (err) {
    return false;
  }
}
