import { CodeAction, CodeActionKind, TextDocument, Range, languages } from 'vscode';
import { ValidationResult } from './../../utils/validation';
import { BaseCodeActionsProvider, CodeActionContextExtended, DiagnosticExtended } from './base-code-actions-provider';

class AnnotationSuppressionsCodeActionsProvider extends BaseCodeActionsProvider<AnnotationSuppressionsCodeAction> {
  public async provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContextExtended) {
    return this.getMonokleDiagnostics(context).map((diagnostic: DiagnosticExtended) => {
      return new AnnotationSuppressionsCodeAction(document, diagnostic);
    });
  }

  public async resolveCodeAction(codeAction: AnnotationSuppressionsCodeAction) {
    const parsedDocument = this.getParsedDocument(codeAction.document, codeAction.result);
    if (!parsedDocument) {
      return codeAction;
    }

    parsedDocument.activeResource.setIn(['metadata', 'annotations', `monokle.io/suppress.${codeAction.result.ruleId}`], 'suppress');

    codeAction.edit = this.generateWorkspaceEdit(parsedDocument.documents, parsedDocument.initialContent, codeAction.document.uri);

    return codeAction;
  }
}

class AnnotationSuppressionsCodeAction extends CodeAction {
  private readonly _document: TextDocument;
  private readonly _result: ValidationResult;

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
  return languages.registerCodeActionsProvider('yaml', new AnnotationSuppressionsCodeActionsProvider(), {
    providedCodeActionKinds: AnnotationSuppressionsCodeActionsProvider.providedCodeActionKinds
  });
}
