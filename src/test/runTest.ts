import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { rm, mkdir, cp } from 'fs/promises';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';

type TestWorkspace = {
  path: string;
  resources: number;
  config: string;
  isWorkspace?: boolean;
  folders?: number;
  disabled?: boolean;
};

async function runSuite(testFile: string, workspaces: TestWorkspace[]) {
  let currentWorkspace: TestWorkspace | undefined;

  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = resolve(__dirname, '../../');

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = resolve(__dirname, testFile);

    // Test fixtures
    const testTmpDir = resolve(__dirname, './tmp');
    const fixturesDestDir = resolve(testTmpDir, './fixtures');
    const fixturesSourceDir = resolve(extensionDevelopmentPath, './src/test/fixtures');

    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
    const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

    // Use cp.spawn / cp.exec for custom setup
    spawnSync(
      cliPath,
      [...args, '--install-extension', 'ms-sarifvscode.sarif-viewer@3.3.8'],
      {
        encoding: 'utf-8',
        stdio: 'inherit'
      }
    );

    for (const workspace of workspaces) {
      currentWorkspace = workspace;

      await rm(testTmpDir, { recursive: true, force: true });
      await mkdir(testTmpDir, { recursive: true });
      await cp(fixturesSourceDir, fixturesDestDir, { recursive: true });

      const testWorkspace = resolve(fixturesDestDir, workspace.path);

      console.log('Running tests for workspace:', testWorkspace);

      await runTests({
        vscodeExecutablePath,
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [testWorkspace],
        extensionTestsEnv: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          EXTENSION_DIR: extensionDevelopmentPath,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          FIXTURES_SOURCE_DIR: fixturesSourceDir,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          WORKSPACE_RESOURCES: workspace.resources.toString(),
          // eslint-disable-next-line @typescript-eslint/naming-convention
          ROOT_PATH: testWorkspace,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          WORKSPACE_CONFIG_TYPE: workspace.config,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          WORKSPACE_DISABLED: Boolean(workspace.disabled === true).toString(),
        }
      });
    }

    currentWorkspace = undefined;
  } catch (err) {
    console.error(`Failed to run tests from ${testFile}`, currentWorkspace, err);
    process.exit(1);
  } finally {
    await rm(resolve(__dirname, './tmp'), { recursive: true, force: true });
  }
}

async function main() {
  const workspaces = [
    {
      path: './folder-with-resources',
      resources: 2,
      config: 'default',
    },
    {
      path: './folder-without-resources',
      resources: 0,
      config: 'file',
    },
    {
      path: './workspace-1/workspace-1.code-workspace',
      resources: 3,
      isWorkspace: true,
      folders: 2,
      config: 'config'
    },
    // This folder has validation disabled in setting by default.
    {
      path: './folder-with-config',
      resources: 1,
      config: 'remote',
      disabled: true,
    },
  ];

  // Run basic tests on single workspace.
  await runSuite('./suite-basic/index', [workspaces[0]]);

  // Run policies tests on single repo.
  await runSuite('./suite-policies/index', [workspaces[3]]);

  // Run integration-like tests on multiple, different workspaces.
  await runSuite('./suite-integration/index', workspaces);
}

main();
