import { MarkdownString } from 'vscode';
import { getWorkspaceConfig, getWorkspaceFolders } from './workspace';
import { getValidationResult } from './validation';
import globals from './globals';
import logger from './logger';
import { getFixTip } from './get-fix-tip';

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
    const fixTip = getFixTip(folderStatus);

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

    let configInfo = `${configType} config`;
    if (config.type === 'remote' && config.remoteProjectName) {
      configInfo = `remote config from **${config.remoteProjectName}** project`;
    }

    return `**${folder.name}**: ❌ ${errors} ⚠️ ${warnings} (_${configInfo}_)`;
  }));

  let activeUserText = '';

  const user = await globals.getUser();
  if (user.isAuthenticated) {
    activeUserText = `<hr><br>Logged in as **${user.email}**`;
  }

  const content = new MarkdownString(`${folderList.join('<br>')}${activeUserText}<hr><br>Click to show validation panel`);
  content.supportHtml = true;

  return {
    content,
    status: isStatusOk ? 'ok' : 'error',
  };
}
