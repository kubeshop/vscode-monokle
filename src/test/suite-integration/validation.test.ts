import { strictEqual, fail } from 'assert';
import { workspace, commands, ConfigurationTarget, WorkspaceEdit, Uri, Range } from 'vscode';
import { resolve, join} from 'path';
import { readFile } from 'fs/promises';
import { parse, stringify } from 'yaml';
import { getWorkspaceFolders } from '../../utils/workspace';
import { COMMANDS } from '../../constants';
import { doSetup, doSuiteSetup, doSuiteTeardown, runForFolders, runForFoldersInSequence } from '../helpers/suite';
import { assertEmptyValidationResults, assertValidationResults, waitForValidationResults } from '../helpers/asserts';

const RUN_ON = process.env.MONOKLE_TEST_VALIDATE_ON_SAVE === 'Y' ? 'onSave' : 'onType';

suite(`Integration - Validation (${RUN_ON}): ${process.env.ROOT_PATH}`, async function () {
  this.timeout(20000);

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
      await workspace.getConfiguration('monokle').update('run', RUN_ON, ConfigurationTarget.Workspace);
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
  });

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
  });

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
  });

  test('Validates resources on change (modification)', async function() {
    if (initialResources === 0 || RUN_ON === 'onSave') {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(folder);
    });

    await runForFoldersInSequence(folders, async (folder) => {
      const file = resolve(folder.uri.fsPath, 'pod-errors.yaml');
      const content = await readFile(file, 'utf-8');
      const asYaml = parse(content);

      asYaml.apiVersion = 'v1alpha1';

      // Edit file via vscode API to trigger change events.
      const edit = new WorkspaceEdit();
      const uri = Uri.file(file);
      const range = new Range(0, 0, 100, 100);
      edit.replace(uri, range, stringify(asYaml));
      const editResult = await workspace.applyEdit(edit);

      if (!editResult) {
        fail('Failed to modify file');
      }

      const result = await waitForValidationResults(folder);
      assertValidationResults(result);
    });
  });

  test('Validates resources on change (addition)', async () => {
    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      await assertEmptyValidationResults(folder);
    });

    await runForFolders(folders, async (folder) => {
      const newResource = resolve(fixturesSourceDir, 'sample-resource.yaml');
      const content = await readFile(newResource, 'utf-8');

      // Edit file via vscode API to trigger change events.
      const edit = new WorkspaceEdit();
      const uri = Uri.file(resolve(folder.uri.fsPath, 'new-resource.yaml'));
      edit.createFile(uri, {
        overwrite: true,
        contents: Buffer.from(content)
      });
      const editResult = await workspace.applyEdit(edit);

      if (!editResult) {
        fail('Failed to create file');
      }

      const result = await waitForValidationResults(folder);
      assertValidationResults(result);
    });
  });

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

      // Edit file via vscode API to trigger change events.
      const edit = new WorkspaceEdit();
      const uri = Uri.file(existingResource);
      edit.deleteFile(uri);
      const editResult = await workspace.applyEdit(edit);

      if (!editResult) {
        fail('Failed to delete file');
      }

      const result = await waitForValidationResults(folder);
      assertValidationResults(result);
    });
  });
});
