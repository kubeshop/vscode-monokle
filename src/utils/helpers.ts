import { createHash } from 'crypto';
import { normalize } from 'path';

export function generateId(path: string) {
  return createHash('md5').update(normalize(path)).digest('hex');
}
