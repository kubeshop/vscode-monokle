import { MarkdownString } from 'vscode';
import { getWorkspaceConfig, getWorkspaceFolders } from './workspace';
import { getValidationResult } from './validation';
import { COMMAND_NAMES } from '../constants';
import globals from './globals';
import logger from './logger';

export type TooltipData = {
  content: string | MarkdownString;
  status: 'ok' | 'error';
};

export function getTooltipContentDefault() {
  if (!globals.enabled) {
    return 'Monokle extension disabled';
  }

  return 'Monokle extension initializing...';
}

export async function getTooltipData(): Promise<TooltipData> {
  if (!globals.enabled) {
    return {
      content: 'Monokle extension disabled',
      status: 'ok',
    };
  }

  let isStatusOk = true;

  const folders = getWorkspaceFolders();
  const folderList = await Promise.all(folders.map(async (folder) => {
    const config = await getWorkspaceConfig(folder);
    const configType = config.type === 'file' || config.type === 'config' ? 'local' : config.type;

    const folderStatus = globals.getFolderStatus(folder);
    const errorStatus = folderStatus?.error ?? '';
    const fixTip = getFixTip(errorStatus);

    logger.log('folderStatus', folderStatus, fixTip);

    if (!config.isValid) {
      isStatusOk = false;

      return `**${folder.name}**: invalid ${configType} config` +
        (fixTip ? `<br>_Fix suggestion_: ${fixTip}` : '');
    }

    const validationResult = await getValidationResult(folder.id);
    const results = validationResult?.runs?.length ? validationResult.runs[0].results : [];

    let errors = 0;
    let warnings = 0;
    results.forEach(result => {
      if (result.level === 'warning') {
        warnings++;
      } else if (result.level === 'error') {
        errors++;
      }
    });

    return `**${folder.name}**: ❌ ${errors} ⚠️ ${warnings} (_config: ${configType}_)`;
  }));

  let activeUserText = '';
  if (globals.user.isAuthenticated) {
    activeUserText = `<hr><br>Logged in as **${globals.user.email}**`;
  }

  const content = new MarkdownString(`${folderList.join('<br>')}${activeUserText}<hr><br>Click to show validation panel`);
  content.supportHtml = true;

  return {
    content,
    status: isStatusOk ? 'ok' : 'error',
  };
}

function getFixTip(err: string) {
  if (err.startsWith('NO_USER')) {
    return `Try logging again with _${COMMAND_NAMES.LOGIN}_ command.`;
  }

  if (err.startsWith('NO_PROJECT')) {
    return 'Add to project in Monokle Cloud.';
  }

  if (err.startsWith('NO_POLICY')) {
    return 'Add policy in Monokle Cloud related project.';
  }

  return '';
}
