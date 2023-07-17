import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

import { parse, stringify } from 'yaml';
import { Folder, getWorkspaceFolders } from '../../utils/workspace';
import { getValidationResult } from '../../utils/validation';
import { generateId } from '../../utils/helpers';
import { COMMANDS } from '../../constants';
import { doSetup, doSuiteTeardown } from '../helpers/suite';

suite(`Integration - Validation: ${process.env.ROOT_PATH}`, () => {
  const extensionDir = process.env.EXTENSION_DIR;
  const fixturesSourceDir = process.env.FIXTURES_SOURCE_DIR;
  const initialResources = parseInt(process.env.WORKSPACE_RESOURCES ?? '0', 10);

  setup(async () => {
    await doSetup();
  });

  suiteTeardown(async () => {
    await doSuiteTeardown();
  });

  // This test should be run first since it checks for a result file
  // created on VSCode instance start.
  test('Validates resources on start', async function () {
    if (initialResources === 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(extensionDir, folder);
    });

    await runForFolders(folders, async (folder) => {
      const result = await waitForValidationResults(extensionDir, folder);
      assertValidationResults(result);
    });
  }).timeout(1000 * 15);

  test('Does not run validation on start when no resources', async function () {
    if (initialResources > 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(extensionDir, folder);
    });

    await runForFolders(folders, async (folder) => {
      const result = await waitForValidationResults(extensionDir, folder, 1000 * 10);
      assert.strictEqual(result, null);
    });
  }).timeout(1000 * 15);

  test('Validates resources on command run', async function() {
    if (initialResources === 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(extensionDir, folder);
    });

    await vscode.commands.executeCommand(COMMANDS.VALIDATE);

    await runForFolders(folders, async (folder) => {
      const result = await waitForValidationResults(extensionDir, folder);
      assertValidationResults(result);
    });
  }).timeout(1000 * 10);

  test('Does not run validation on command when no resources', async function() {
    if (initialResources > 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(extensionDir, folder);
    });

    await vscode.commands.executeCommand(COMMANDS.VALIDATE);

    await runForFolders(folders, async (folder) => {
      const result = await waitForValidationResults(extensionDir, folder, 1000 * 7);
      assert.strictEqual(result, null);
    });
  }).timeout(1000 * 10);

  test('Validates resources on change (modification)', async function() {
    if (initialResources === 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(extensionDir, folder);
    });

    await runForFolders(folders, async (folder) => {
      const file = path.resolve(folder.uri.fsPath, 'pod-errors.yaml');
      const content = await fs.readFile(file, 'utf-8');
      const asYaml = parse(content);

      asYaml.apiVersion = 'v1beta1';

      await fs.writeFile(file, stringify(asYaml));

      const result = await waitForValidationResults(extensionDir, folder);
      assertValidationResults(result);
    });
  }).timeout(1000 * 10);

  test('Validates resources on change (addition)', async () => {
    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(extensionDir, folder);
    });

    await runForFolders(folders, async (folder) => {
      const newResource = path.resolve(fixturesSourceDir, 'sample-resource.yaml');

      await fs.copyFile(newResource, path.resolve(folder.uri.fsPath, 'new-resource.yaml'));

      const result = await waitForValidationResults(extensionDir, folder);
      assertValidationResults(result);
    });
  }).timeout(1000 * 10);

  test('Validates resources on change (deletion)', async function () {
    if (initialResources === 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(extensionDir, folder);
    });

    await runForFolders(folders, async (folder) => {
      const existingResource = path.resolve(folder.uri.fsPath, 'pod-errors.yaml');

      await fs.rm(existingResource);

      const result = await waitForValidationResults(extensionDir, folder);
      assertValidationResults(result);
    });
  }).timeout(1000 * 10);
});

async function assertEmptyValidationResults(extensionDir, workspaceFolder: Folder): Promise<void> {
  const result = await getValidationResult(extensionDir, generateId(workspaceFolder.uri.fsPath));

  assert.ok(result === null);
}

async function waitForValidationResults(extensionDir, workspaceFolder: Folder, timeoutMs?: number): Promise<any> {
  return new Promise((res) => {
    let timeoutId = null;

    const intervalId = setInterval(async () => {
      const result = await getValidationResult(extensionDir, generateId(workspaceFolder.uri.fsPath));

      if (result) {
        clearInterval(intervalId);
        timeoutId && clearTimeout(timeoutId);
        res(result);
      }
    }, 250);

    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        res(null);
      }, timeoutMs);
    }
  });
}

function assertValidationResults(result) {
  assert.ok(result);
  assert.ok(result?.runs);
  assert.ok(result.runs[0].tool);
  assert.ok(result.runs[0].results);
  assert.ok(result.runs[0].taxonomies);
}

async function runForFolders(folders: Folder[], fn: (folder: Folder) => Promise<void>) {
  return Promise.all(folders.map(async (folder) => {
    return fn(folder);
  }));
};

// @TODO cover below scenarios:
// reacts to on/off config change
// revalidates resources when local validation config file changed
// does not run when turned off
//
// @TODO Run above for multiple folders (single, workspace, with and without config, with global config)
//
// setting can be put in .vscode/settings.json file for folder or workspace file for workspace