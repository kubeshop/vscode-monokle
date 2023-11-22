import { equal } from 'assert';
import { getWorkspaceConfig, getWorkspaceFolders } from '../../utils/workspace';
import { doSetup, doSuiteSetup, doSuiteTeardown } from '../helpers/suite';

suite(`Integration - Config: ${process.env.ROOT_PATH}`, function () {
  this.timeout(10000);

  suiteSetup(async () => {
    await doSuiteSetup();
  });

  setup(async () => {
    await doSetup();
  });

  suiteTeardown(async () => {
    await doSuiteTeardown();
  });

  test('Uses correct validation config', async function () {
    if (!process.env.WORKSPACE_CONFIG_TYPE) {
      this.skip();
    }

    const folders = getWorkspaceFolders();
    const config = await getWorkspaceConfig(folders[0]);

    equal(config.type, process.env.WORKSPACE_CONFIG_TYPE);
  });
});
