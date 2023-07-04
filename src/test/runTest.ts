import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to test runner
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Test fixtures
		const testTmpDir = path.resolve(__dirname, './tmp');
		const fixturesDestDir = path.resolve(testTmpDir, './fixtures');
		const fixturesSourceDir = path.resolve(extensionDevelopmentPath, './src/test/fixtures');

		const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
		const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

		// Use cp.spawn / cp.exec for custom setup
		cp.spawnSync(
			cliPath,
			[...args, '--install-extension', 'ms-sarifvscode.sarif-viewer@3.3.8'],
			{
				encoding: 'utf-8',
				stdio: 'inherit'
			}
		);

		const workspaces = [
			{
				path: './folder-with-single-resource',
				resources: 1,
			},
			{
				path: './folder-without-resources',
				resources: 0,
			},
			{
				path: './workspace-1/workspace-1.code-workspace',
				resources: 2,
				isWorkspace: true,
				folders: 2,
			},
		];

		for (const workspace of workspaces) {
			await fs.rm(testTmpDir, { recursive: true, force: true });
			await fs.mkdir(testTmpDir, { recursive: true });
			await fs.cp(fixturesSourceDir, fixturesDestDir, { recursive: true });

			const testWorkspace = path.resolve(fixturesDestDir, workspace.path);

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
				}
			});
		}
	} catch (err) {
		console.error('Failed to run tests', err);
		process.exit(1);
	} finally {
		await fs.rm(path.resolve(__dirname, './tmp'), { recursive: true, force: true });
	}
}

main();
