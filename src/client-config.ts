import { type, release } from 'os';
import { readFileSync } from 'fs';
import { env } from 'vscode';
import globals from './utils/globals';

const CLIENT_NAME = 'Monokle VSCode';

export function getClientConfig() {
	const pkg = JSON.parse(readFileSync(`${__dirname}/../package.json`, 'utf8'));
	const additionalData = globals.telemetryEnabled ? { machineId: env.machineId } : {};

	return {
		name: CLIENT_NAME,
		version: pkg.version,
		os: `${type()} ${release()}`,
		additionalData,
	};
}
