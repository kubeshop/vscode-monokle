import { runTestsFromDir } from '../helpers/run';

export function run(): Promise<void> {
  return runTestsFromDir(__dirname);
}
