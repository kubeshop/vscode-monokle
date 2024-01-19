import type { RuntimeContext } from '../utils/runtime-context';

// This is internal command so we don't expose it in package.json
export function getAutofixCommand(_context: RuntimeContext) {
  return () => {
    console.log('Autofix Command');
  };
}
