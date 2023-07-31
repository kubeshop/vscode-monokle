import envPaths from 'env-paths';
import { Document, parse } from 'yaml';
import { mkdirp } from 'mkdirp';
import { existsSync, readFileSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { dirname, join, normalize } from 'path';
import type { Token } from '../commands/login';

type StoreAuth = {
  auth?: {
    email: string;
    accessToken: string;
    accessTokenData: Token;
  }
};

const CONFIG_FOLDER = 'monokle';
const CONFIG_FILE_AUTH = 'auth.yaml';

export async function getStoreAuth(): Promise<StoreAuth | undefined> {
  const configPath = getStoreConfigPath(CONFIG_FILE_AUTH);
  return getStoreData(configPath);
}

export function getStoreAuthSync(): StoreAuth | undefined {
  const configPath = getStoreConfigPath(CONFIG_FILE_AUTH);
  return getStoreDataSync(configPath);
}

export async function emptyStoreAuth(): Promise<boolean> {
  const configPath = getStoreConfigPath(CONFIG_FILE_AUTH);
  return writeStoreData(configPath, '');
}

export async function setStoreAuth(email: string, accessTokenData: Token): Promise<boolean> {
  const configPath = getStoreConfigPath(CONFIG_FILE_AUTH);
  const configDoc = new Document();
  configDoc.contents = ({
    auth: {
      email,
      accessToken: accessTokenData.access_token,
      accessTokenData,
    }
  } as any);

  return writeStoreData(configPath, configDoc.toString());
}

function getStoreConfigPath(file: string): string {
  const paths = envPaths(CONFIG_FOLDER, { suffix: '' });
  const configPath = normalize(join(process.env.MONOKLE_TEST_CONFIG_PATH ?? paths.config, file));
  return configPath;
}

async function getStoreData(file: string) {
  if (!existsSync(file)) {
    return undefined;
  }

  try {
    const data = await readFile(file, 'utf8');
    const config = parse(data);
    return config;
  } catch (err) {
    console.error('Failed to read configuration from ' + file);
    return undefined;
  }
}

function getStoreDataSync(file: string) {
  if (!existsSync(file)) {
    return undefined;
  }

  try {
    const data = readFileSync(file, 'utf8');
    const config = parse(data);
    return config;
  } catch (err) {
    console.error('Failed to read configuration from ' + file);
    return undefined;
  }
}

async function writeStoreData(file: string, data: string) {
  const dir = dirname(file);

  try {
    await mkdirp(dir);
    await writeFile(file, data);
    return true;
  } catch (err) {
    return false;
  }
}
