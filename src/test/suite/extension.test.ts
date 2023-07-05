import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { parse, stringify } from 'yaml';
import { Folder, getWorkspaceConfig, getWorkspaceFolders } from '../../utils/workspace';
import { getValidationResult } from '../../utils/validation';
import { generateId } from '../../utils/helpers';

suite(`Monokle Extension Test Suite: ${process.env.ROOT_PATH}`, () => {
	const extensionDir = process.env.EXTENSION_DIR;
	const sharedStorageDir = path.resolve(extensionDir, '.monokle');
	const fixturesSourceDir = process.env.FIXTURES_SOURCE_DIR;

	const initialResources = parseInt(process.env.WORKSPACE_RESOURCES ?? '0', 10);

	setup(async () => {
		await fs.rm(sharedStorageDir, { recursive: true, force: true });
	});

	suiteTeardown(async () => {
		await fs.rm(sharedStorageDir, { recursive: true, force: true });
	});

	// This test should be run first since it checks for a result file
	// created on VSCode instance start.
	test('Validates resources on start', async function () {
		if (initialResources === 0) {
			this.skip();
		}

		const folders = getWorkspaceFolders();

		await assertEmptyValidationResults(extensionDir, folders[0]);

		const result = await waitForValidationResults(extensionDir, folders[0]);
		assertValidationResults(result);
	}).timeout(1000 * 15);

	test('Does not run validation on start when no resources', async function () {
		if (initialResources > 0) {
			this.skip();
		}

		const folders = getWorkspaceFolders();

		await assertEmptyValidationResults(extensionDir, folders[0]);

		const result = await waitForValidationResults(extensionDir, folders[0], 1000 * 10);
		assert.strictEqual(result, null);
	}).timeout(1000 * 15);

	test('Exposes validate command', async function() {
		const commands = await vscode.commands.getCommands(false);
		assert.ok(commands.includes('monokle-vsc.validate'));
	});

	test('Exposes watch command', async () => {
		const commands = await vscode.commands.getCommands(false);
		assert.ok(commands.includes('monokle-vsc.watch'));
	});

	test('Validates resources on command run', async function() {
		if (initialResources === 0) {
			this.skip();
		}

		const folders = getWorkspaceFolders();

		await assertEmptyValidationResults(extensionDir, folders[0]);

		await vscode.commands.executeCommand('monokle-vsc.validate');

		const result = await waitForValidationResults(extensionDir, folders[0]);
		assertValidationResults(result);
	}).timeout(1000 * 10);

	test('Does not run validation on command when no resources', async function() {
		if (initialResources > 0) {
			this.skip();
		}

		const folders = getWorkspaceFolders();

		await assertEmptyValidationResults(extensionDir, folders[0]);

		await vscode.commands.executeCommand('monokle-vsc.validate');

		const result = await waitForValidationResults(extensionDir, folders[0], 1000 * 7);
		assert.strictEqual(result, null);
	}).timeout(1000 * 10);

	test('Validates resources on change (modification)', async function() {
		if (initialResources === 0) {
			this.skip();
		}

		const folders = getWorkspaceFolders();

		await assertEmptyValidationResults(extensionDir, folders[0]);

		const file = path.resolve(folders[0].uri.fsPath, 'pod-errors.yaml');
		const content = await fs.readFile(file, 'utf-8');
		const asYaml = parse(content);

		asYaml.apiVersion = 'v1beta1';

		await fs.writeFile(file, stringify(asYaml));

		const result = await waitForValidationResults(extensionDir, folders[0]);
		assertValidationResults(result);
	}).timeout(1000 * 10);

	test('Validates resources on change (addition)', async () => {
		const folders = getWorkspaceFolders();

		await assertEmptyValidationResults(extensionDir, folders[0]);

		const newResource = path.resolve(fixturesSourceDir, 'sample-resource.yaml');

		await fs.copyFile(newResource, path.resolve(folders[0].uri.fsPath, 'new-resource.yaml'));

		// how to make sure that new resource was validated?
		const result = await waitForValidationResults(extensionDir, folders[0]);
		assertValidationResults(result);
	});

	test('Validates resources on change (deletion)', async function () {
		if (initialResources === 0) {
			this.skip();
		}

		const folders = getWorkspaceFolders();

		await assertEmptyValidationResults(extensionDir, folders[0]);

		const existingResource = path.resolve(folders[0].uri.fsPath, 'cronjob.yml');

		await fs.rm(existingResource);

		// how to make sure that new resource was validated?
		const result = await waitForValidationResults(extensionDir, folders[0]);
		assertValidationResults(result);
	});

	test('Uses correct validation config', async function () {
		if (!process.env.WORKSPACE_CONFIG_TYPE) {
			this.skip();
		}

		const folders = getWorkspaceFolders();
		const config = await getWorkspaceConfig(folders[0]);

		assert.equal(config.type, process.env.WORKSPACE_CONFIG_TYPE);
	});
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

// @TODO cover below scenarios:
// reacts to on/off config change
// revalidates resources when local validation config file changed
// does not run when turned off
//
// @TODO Run above for multiple folders (single, workspace, with and without config, with global config)
//
// setting can be put in .vscode/settings.json file for folder or workspace file for workspace