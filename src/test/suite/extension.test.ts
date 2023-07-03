import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getWorkspaceFolders } from '../../utils/workspace';
import { getValidationResult } from '../../utils/validation';
import { generateId } from '../../utils/helpers';

suite('Monokle Extension Test Suite', () => {
	const extensionDir = path.resolve(__dirname, './../../../');
	const sharedStorageDir = path.resolve(__dirname, extensionDir, '.monokle');

	setup(async () => {
		await fs.rm(sharedStorageDir, { recursive: true, force: true });
	});

	suiteTeardown(async () => {
		await fs.rm(sharedStorageDir, { recursive: true, force: true });
	});

	test('Exposes validate command', async () => {
		const commands = await vscode.commands.getCommands(false);

		assert.ok(commands.includes('monokle-vsc.validate'));
	});

	test('Exposes watch command', async () => {
		const commands = await vscode.commands.getCommands(false);

		assert.ok(commands.includes('monokle-vsc.watch'));
	});

	test('Validates resources on start', async () => {
		return new Promise((res) => {
			const folders = getWorkspaceFolders();

			const intervalId = setInterval(async () => {
				const result = await getValidationResult(extensionDir, generateId(folders[0].uri.fsPath));

				if (result) {
					clearInterval(intervalId);

					assert.ok(result);
					assert.ok(result?.runs);
					assert.ok(result.runs[0].tool);
					assert.ok(result.runs[0].results);
					assert.ok(result.runs[0].taxonomies);

					res();
				}
			}, 500);
		});
	}).timeout(1000 * 15);
});


// validates resources on command run
// revalidates resources when they are changed (added, removed, deleted)
// revalidates resources when local config changed
// react to on/off config change
// reads local config
// uses validation config defined in config path
// does not run when turned off

// Run above for multiple folders (single, workspace, with and without config, with global config)