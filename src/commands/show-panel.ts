import { commands, extensions } from 'vscode';
import { canRun } from '../utils/commands';
import { trackEvent } from '../utils/telemetry';

export function getShowPanelCommand() {
  return async () => {
    if (!canRun()) {
      return null;
    }

    trackEvent('command/show_panel', {
      status: 'started'
    });

    const sarifExtension = extensions.getExtension('Kubeshop.monokle-sarif');

    if (!sarifExtension.isActive) {
      await sarifExtension.activate();
    }

    await commands.executeCommand('sarif.showPanel');

    trackEvent('command/show_panel', {
      status: 'success'
    });
  };
}
