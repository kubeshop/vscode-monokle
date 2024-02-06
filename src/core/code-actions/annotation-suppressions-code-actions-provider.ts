import { CodeAction, CodeActionKind, TextDocument, Range, languages } from 'vscode';
import { BaseCodeActionsProvider, CodeActionContextExtended, DiagnosticExtended, ValidationResultExtended } from './base-code-actions-provider';
import { COMMANDS } from '../../constants';
import { getOwnerWorkspace } from '../../utils/workspace';
import { shouldUseFingerprintSuppressions } from '../suppressions/suppressions';

class AnnotationSuppressionsCodeActionsProvider extends BaseCodeActionsProvider<AnnotationSuppressionsCodeAction> {
  public async provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContextExtended) {
    const workspaceRoot = getOwnerWorkspace(document);
    const fingerprintSuppressionsPermissions = shouldUseFingerprintSuppressions(workspaceRoot.uri.fsPath);

    // We allow either annotation or fingerprint suppressions at the same time, but not both.
    if (fingerprintSuppressionsPermissions.allowed) {
      return [];
    }

    return this.getMonokleDiagnostics(context).map((diagnostic: DiagnosticExtended) => {
      return new AnnotationSuppressionsCodeAction(document, diagnostic);
    });
  }

  public async resolveCodeAction(codeAction: AnnotationSuppressionsCodeAction) {
    const parsedDocument = this.getParsedDocument(codeAction.document, codeAction.result);
    if (!parsedDocument) {
      return codeAction;
    }

    const ruleFullName = `${codeAction.result._rule.id.substring(0,3).toLowerCase()}.${codeAction.result._rule.name}`;
    parsedDocument.activeResource.setIn(['metadata', 'annotations', `monokle.io/suppress.${ruleFullName}`], 'suppress');

    codeAction.edit = this.generateWorkspaceEdit(parsedDocument.documents, parsedDocument.initialContent, codeAction.document.uri);

    codeAction.command = {
      command: COMMANDS.TRACK,
      title: 'Track',
      arguments: ['code_action/annotation_suppression', {status: 'success', ruleId: codeAction.result.ruleId}]
    };

    return codeAction;
  }
}

class AnnotationSuppressionsCodeAction extends CodeAction {
  private readonly _document: TextDocument;
  private readonly _result: ValidationResultExtended;

  constructor(document: TextDocument, diagnostic: DiagnosticExtended) {
    super(`Suppress "${diagnostic.result._rule.name} (${diagnostic.result._rule.id})" rule for this resource`, CodeActionKind.QuickFix);

    this.diagnostics = [diagnostic];
    this._document = document;
    this._result = diagnostic.result;
  }

  get document() {
    return this._document;
  }

  get result() {
    return this._result;
  }
}

export function registerAnnotationSuppressionsCodeActionsProvider() {
  return languages.registerCodeActionsProvider({language: 'yaml'}, new AnnotationSuppressionsCodeActionsProvider(), {
    providedCodeActionKinds: AnnotationSuppressionsCodeActionsProvider.providedCodeActionKinds
  });
}
