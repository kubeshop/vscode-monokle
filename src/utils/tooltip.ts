import { MarkdownString } from 'vscode';
import { getWorkspaceConfig, getWorkspaceFolders } from './workspace';
import { getValidationResult } from './validation';
import globals from './globals';

export function getTooltipContentDefault() {
  if (!globals.enabled) {
    return 'Monokle extension disabled';
  }

  return 'Monokle extension initializing...';
}

export async function getTooltipContent() {
  if (!globals.enabled) {
    return 'Monokle extension disabled';
  }

  const folders = getWorkspaceFolders();
  const folderList = await Promise.all(folders.map(async (folder) => {
    const config = await getWorkspaceConfig(folder);
    const configType = config.type === 'file' || config.type === 'config' ? 'local' : config.type;

    if (!config.isValid) {
      return `**${folder.name}**: invalid ${configType} config`;
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

  const content = new MarkdownString(`${folderList.join('<br>')}${activeUserText}<hr><br>Show validation panel`);
  content.supportHtml = true;

  return content;
}