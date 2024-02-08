import { CodeAction, CodeActionKind, TextDocument, Range, languages, Uri } from 'vscode';
import { BaseCodeActionsProvider, CodeActionContextExtended, DiagnosticExtended, ValidationResultExtended } from './base-code-actions-provider';
import { COMMANDS } from '../../constants';
import { Folder, getOwnerWorkspace } from '../../utils/workspace';
import globals from '../../utils/globals';
import { SuppressionPermissions, isUnderReview, shouldUseFingerprintSuppressions } from '../suppressions/suppressions';

class FingerprintSuppressionsCodeActionsProvider extends BaseCodeActionsProvider<FingerprintSuppressionsCodeAction> {
  public async provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContextExtended) {
    const workspaceRoot = getOwnerWorkspace(document);
    const fingerprintSuppressionsPermissions = shouldUseFingerprintSuppressions(workspaceRoot.uri.fsPath);

    if (!fingerprintSuppressionsPermissions.allowed) {
      return [];
    }

    return this.getMonokleDiagnostics(context)
      .filter((diagnostic: DiagnosticExtended) => !isUnderReview(diagnostic.result))
      .map((diagnostic: DiagnosticExtended) => {
        return new FingerprintSuppressionsCodeAction(diagnostic, fingerprintSuppressionsPermissions.permissions, workspaceRoot);
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
      codeAction.command = {
        command: COMMANDS.SUPPRESS,
        title: 'Suppress misconfiguration',
        arguments: [codeAction.result, codeAction.permissions, codeAction.root]
      };
    }

    return codeAction;
  }
}

class FingerprintSuppressionsCodeAction extends CodeAction {
  private readonly _result: ValidationResultExtended;
  private readonly _permissions: SuppressionPermissions;
  private readonly _root: Folder;

  constructor(diagnostic: DiagnosticExtended, permissions: SuppressionPermissions, root: Folder) {
    super(`${permissions === 'ADD' ? 'Suppress' : 'Request suppression of'} this "${diagnostic.result._rule.name} (${diagnostic.result._rule.id})" problem`, CodeActionKind.QuickFix);

    this.diagnostics = [diagnostic];
    this._result = diagnostic.result;
    this._permissions = permissions;
    this._root = root;
  }

  get result() {
    return this._result;
  }

  get permissions() {
    return this._permissions;
  }

  get root() {
    return this._root;
  }
}

export function registerFingerprintSuppressionsCodeActionsProvider() {
  return languages.registerCodeActionsProvider({language: 'yaml'}, new FingerprintSuppressionsCodeActionsProvider(), {
    providedCodeActionKinds: FingerprintSuppressionsCodeActionsProvider.providedCodeActionKinds
  });
}
