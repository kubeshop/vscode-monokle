import { type, release } from 'os';
import { readFileSync } from 'fs';
import { env } from 'vscode';

const CLIENT_NAME = 'Monokle CLI';

export function getClientConfig() {
	const pkg = JSON.parse(readFileSync(`${__dirname}/../package.json`, 'utf8'));

	return {
		name: CLIENT_NAME,
		version: pkg.version,
		os: `${type()} ${release()}`,
		additionalData: {
			machineId: env.machineId,
		}
	};
}
