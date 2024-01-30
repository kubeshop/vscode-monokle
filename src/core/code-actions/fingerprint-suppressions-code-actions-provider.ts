import { CodeAction, CodeActionKind, TextDocument, Range, languages } from 'vscode';
import { BaseCodeActionsProvider, CodeActionContextExtended, DiagnosticExtended, ValidationResultExtended } from './base-code-actions-provider';
import { COMMANDS } from '../../constants';
import { getOwnerWorkspace } from '../../utils/workspace';
import globals from '../../utils/globals';
import { SuppressionPermissions, shouldUseFingerprintSuppressions } from '../suppressions/suppressions';

class FingerprintSuppressionsCodeActionsProvider extends BaseCodeActionsProvider<FingerprintSuppressionsCodeAction> {
  public async provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContextExtended) {
    const workspaceRoot = getOwnerWorkspace(document);
    const fingerprintSuppressionsPermissions = await shouldUseFingerprintSuppressions(workspaceRoot.uri.fsPath);

    if (!fingerprintSuppressionsPermissions.allowed) {
      return [];
    }

    return this.getMonokleDiagnostics(context).map((diagnostic: DiagnosticExtended) => {
      return new FingerprintSuppressionsCodeAction(diagnostic, fingerprintSuppressionsPermissions.permissions);
    });
  }

  public async resolveCodeAction(codeAction: FingerprintSuppressionsCodeAction) {
    const user = await globals.getUser();

    if (!user.isAuthenticated) {
      // This should not happen, since we don't show this code action if user is not authenticated.
      // Still handle it if something unpredictable happens.
      codeAction.command = {
        command: COMMANDS.RAISE_AUTHENTICATION_ERROR,
        title: 'Raise Authentication Error',
        arguments: ['Suppressing a problem requires authentication.', {
          event: 'code_action/fingerprint_suppression',
          data: {
            status: 'cancelled',
            ruleId: codeAction.result.ruleId,
            error: 'Unauthenticated',
          }
        }]
      };
    } else {
      // suppress + track
      // what about removal, removal option should be shown in SARIF panel
      codeAction.command = {
        command: COMMANDS.TRACK,
        title: 'Track',
        arguments: ['code_action/fingerprint_suppression', {
          status: 'success',
          action: codeAction.permissions === 'ADD' ? 'add' : 'request',
          ruleId: codeAction.result.ruleId
        }]
      };
    }

    return codeAction;
  }
}

class FingerprintSuppressionsCodeAction extends CodeAction {
  private readonly _result: ValidationResultExtended;
  private readonly _permissions: SuppressionPermissions;

  constructor(diagnostic: DiagnosticExtended, permissions: SuppressionPermissions) {
    super(`${permissions === 'ADD' ? 'Suppress' : 'Request suppression of'} this "${diagnostic.result._rule.name} (${diagnostic.result._rule.id})" problem`, CodeActionKind.QuickFix);

    this.diagnostics = [diagnostic];
    this._result = diagnostic.result;
    this._permissions = permissions;
  }

  get result() {
    return this._result;
  }

  get permissions() {
    return this._permissions;
  }
}

export function registerFingerprintSuppressionsCodeActionsProvider() {
  return languages.registerCodeActionsProvider({language: 'yaml'}, new FingerprintSuppressionsCodeActionsProvider(), {
    providedCodeActionKinds: FingerprintSuppressionsCodeActionsProvider.providedCodeActionKinds
  });
}
