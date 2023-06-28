import * as vscode from 'vscode';
import { getWorkspaceFolders, getWorkspaceResources } from './utils/workspace';
import { getValidator, saveValidationResults } from './utils/validation';

// watchers[] (to deregister on deactivate)

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "monokle-vsc" is now active!', vscode.workspace.workspaceFolders);

	// High level flow:
	// Init watcher for each workspace folder
	// Validate each workspace folder on init
	// - should look for monokle config file in each workspace separately
	// - fallback to default config
	// Show errors
	// - should be shown as one, gathered from all workspaces

	// Validating workspace:
	// - find all yaml files
	// - parse them and convert to resources
	// - pass to validator (for multipe workspaces gather all and pass at once)

	// Watching workspaces:
	// TBD...

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('monokle-vsc.validate', async () => {
		const roots = getWorkspaceFolders();
		const resources = (await Promise.all(roots.map((root) => getWorkspaceResources(root)))).flat();

		console.log(resources);

		const validator = await getValidator();

		console.log(validator);

		const results = await validator.validate({
			resources: resources,
		});

		console.log(results);

		const resultsFilePath = await saveValidationResults(results, context.extensionPath);

		console.log(resultsFilePath);

		const sarifExtension = vscode.extensions.getExtension('MS-SarifVSCode.sarif-viewer');
		if (!sarifExtension.isActive) {
			await sarifExtension.activate();
		}

		await sarifExtension.exports.openLogs([
			vscode.Uri.file(resultsFilePath),
		]);
	});

	context.subscriptions.push(disposable);

	vscode.commands.executeCommand('monokle-vsc.validate');
}

// This method is called when your extension is deactivated
// deregister fs watchers
// clear sarif logs
export function deactivate() {}
