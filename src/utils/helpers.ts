import { createHash } from 'crypto';
import { normalize } from 'path';

export function generateId(path: string) {
  return createHash('md5').update(normalize(path)).digest('hex');
}

export function delay(ms: number = 0) {
  return new Promise((res) => setTimeout(res, ms));
}
