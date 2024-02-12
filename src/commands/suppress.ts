import { canRun } from '../utils/commands';
import { COMMAND_NAMES } from '../constants';
import { raiseWarning } from '../utils/errors';
import { trackEvent } from '../utils/telemetry';
import { MONOKLE_FINGERPRINT_FIELD, ValidationResultExtended } from '../core/code-actions/base-code-actions-provider';
import { SuppressionPermissions, generateSuppression } from '../core';
import { applySuppressions } from '../utils/validation';
import { Folder } from '../utils/workspace';
import globals from '../utils/globals';
import type { RuntimeContext } from '../utils/runtime-context';

export function getSuppressCommand(context: RuntimeContext) {
  return async (result: ValidationResultExtended, permissions: SuppressionPermissions, root: Folder) => {
    if (!canRun()) {
      return null;
    }

    if (permissions === 'NONE') {
      // Should not happen, since permissions are checked in CodeActionProvider. Still handle gracefully.
      raiseWarning('You do not have permissions to suppress this misconfiguration');

      trackEvent('command/suppress', {
        status: 'failure',
        error: 'Suppression command run despite no permissions.'
      });

      return null;
    }

    trackEvent('command/suppress', {
      status: 'started'
    });

    const user = await globals.getUser();

    if (!user.isAuthenticated) {
      raiseWarning(`You need to be logged in to use suppressions. Run ${COMMAND_NAMES.LOGIN} to authenticate first.}`);

      trackEvent('command/suppress', {
        status: 'failure',
        error: 'User not authenticated.'
      });

      return null;
    }


    const localSuppression = generateSuppression(result.fingerprints?.[MONOKLE_FINGERPRINT_FIELD], permissions);

    await applySuppressions(root, localSuppression);

    await context.synchronizer.toggleSuppression(
        user.tokenInfo,
        result.fingerprints?.[MONOKLE_FINGERPRINT_FIELD],
        `${result.ruleId} - ${result.message.text}`,
        result.locations.at(1).logicalLocations?.at(0)?.fullyQualifiedName,
        root.uri.fsPath,
        globals.project || undefined
    );

    await applySuppressions(root);

    trackEvent('command/suppress', {
      status: 'success'
    });
  };
}
