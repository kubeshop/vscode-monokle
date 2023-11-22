import { strictEqual } from 'assert';
import { workspace, commands, ConfigurationTarget, extensions } from 'vscode';
import { resolve, join} from 'path';
import { readFile, writeFile, copyFile, rm } from 'fs/promises';
import { parse, stringify } from 'yaml';
import { getWorkspaceFolders } from '../../utils/workspace';
import { COMMANDS } from '../../constants';
import { doSetup, doSuiteSetup, doSuiteTeardown, runForFolders } from '../helpers/suite';
import { assertEmptyValidationResults, assertValidationResults, waitForValidationResults } from '../helpers/asserts';

suite(`Integration - Validation: ${process.env.ROOT_PATH}`, function () {
  this.timeout(10000);

  const fixturesSourceDir = process.env.FIXTURES_SOURCE_DIR;
  const initialResources = parseInt(process.env.WORKSPACE_RESOURCES ?? '0', 10);
  const isDisabled = process.env.WORKSPACE_DISABLED === 'true';

  suiteSetup(async function () {
    await doSuiteSetup();

    if (isDisabled) {
      this.skip();
    }

    if (process.env.WORKSPACE_CONFIG_TYPE === 'config') {
      // Make sure 'monokle.configurationPath' uses absolute path.
      const configFile = resolve(join(__dirname, '..', 'tmp', 'fixtures', workspace.getConfiguration('monokle').get('configurationPath')));
      console.log('Setting config file to', configFile);
      await workspace.getConfiguration('monokle').update('configurationPath', configFile, ConfigurationTarget.Workspace);
    }
  });

  setup(async () => {
    await doSetup();
  });

  suiteTeardown(async () => {
    await doSuiteTeardown();
  });

  test('Does not run validation on start when no resources', async function () {
    if (initialResources > 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(folder);
    });

    await runForFolders(folders, async (folder) => {
      const result = await waitForValidationResults(folder, 1000 * 10);
      strictEqual(result, null);
    });
  }).timeout(1000 * 15);

  test('Validates resources on command run', async function() {
    if (initialResources === 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(folder);
    });

    await commands.executeCommand(COMMANDS.VALIDATE);

    await runForFolders(folders, async (folder) => {
      const result = await waitForValidationResults(folder);
      assertValidationResults(result);
    });
  }).timeout(1000 * 10);

  test('Does not run validation on command when no resources', async function() {
    if (initialResources > 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(folder);
    });

    await commands.executeCommand(COMMANDS.VALIDATE);

    await runForFolders(folders, async (folder) => {
      const result = await waitForValidationResults(folder, 1000 * 7);
      strictEqual(result, null);
    });
  }).timeout(1000 * 10);

  test('Validates resources on change (modification)', async function() {
    if (initialResources === 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(folder);
    });

    await runForFolders(folders, async (folder) => {
      const file = resolve(folder.uri.fsPath, 'pod-errors.yaml');
      const content = await readFile(file, 'utf-8');
      const asYaml = parse(content);

      asYaml.apiVersion = 'v1beta1';

      await writeFile(file, stringify(asYaml));

      const result = await waitForValidationResults(folder);
      assertValidationResults(result);
    });
  }).timeout(1000 * 10);

  test('Validates resources on change (addition)', async () => {
    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(folder);
    });

    await runForFolders(folders, async (folder) => {
      const newResource = resolve(fixturesSourceDir, 'sample-resource.yaml');

      await copyFile(newResource, resolve(folder.uri.fsPath, 'new-resource.yaml'));

      const result = await waitForValidationResults(folder);
      assertValidationResults(result);
    });
  }).timeout(1000 * 10);

  test('Validates resources on change (deletion)', async function () {
    if (initialResources === 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(folder);
    });

    await runForFolders(folders, async (folder) => {
      const existingResource = resolve(folder.uri.fsPath, 'pod-errors.yaml');

      await rm(existingResource, { force: true });

      const result = await waitForValidationResults(folder);
      assertValidationResults(result);
    });
  }).timeout(1000 * 10);
});
