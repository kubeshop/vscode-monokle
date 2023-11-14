import { COMMAND_NAMES } from '../constants';
import { FolderStatus } from './globals';

export function getFixTip(folderStatus: FolderStatus) {
  const err = folderStatus?.error ?? '';

  if (err.startsWith('NO_REPO')) {
      return 'Current folder needs to be a git repository.';
  }

  if (err.startsWith('NO_USER')) {
      return `Looks like connection or authentication issue. Try logging again with _${COMMAND_NAMES.LOGIN}_ command.`;
  }

  if (err.startsWith('NO_PROJECT')) {
      return 'Add current repo to a project in Monokle Cloud.';
  }

  if (err.startsWith('NO_POLICY')) {
      return 'Add policy in Monokle Cloud related project.';
  }

  return '';
}
