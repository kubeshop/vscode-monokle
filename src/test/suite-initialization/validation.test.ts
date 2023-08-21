import { getWorkspaceFolders } from '../../utils/workspace';
import { doSuiteSetup, doSuiteTeardown, runForFolders } from '../helpers/suite';
import { assertValidationResults, waitForValidationResults } from '../helpers/asserts';

suite(`Initialization - Validation: ${process.env.ROOT_PATH}`, function () {
  this.timeout(5000);
  const initialResources = parseInt(process.env.WORKSPACE_RESOURCES ?? '0', 10);
  const isDisabled = process.env.WORKSPACE_DISABLED === 'true';

  suiteSetup(async function () {
    await doSuiteSetup();

    if (isDisabled) {
      this.skip();
    }
  });

  suiteTeardown(async () => {
    await doSuiteTeardown();
  });

  test('Validates resources on start', async function () {
    if (initialResources === 0) {
      this.skip();
    }

    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      const result = await waitForValidationResults(folder);
      assertValidationResults(result);
    });
  }).timeout(1000 * 15);
});
