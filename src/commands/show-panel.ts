import { commands, extensions } from 'vscode';
import { canRun } from '../utils/commands';

export function getShowPanelCommand() {
  return async () => {
    if (!canRun()) {
      return null;
    }

    const sarifExtension = extensions.getExtension('MS-SarifVSCode.sarif-viewer');

    if (!sarifExtension.isActive) {
      await sarifExtension.activate();
    }

    return commands.executeCommand('sarif.showPanel');
  };
}