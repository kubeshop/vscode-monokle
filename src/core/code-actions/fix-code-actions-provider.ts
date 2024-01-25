import { CodeAction, CodeActionKind, TextDocument, Range, languages, WorkspaceEdit, Position, extensions, window } from 'vscode';
import { BaseCodeActionsProvider, CodeActionContextExtended, DiagnosticExtended, ValidationResultExtended } from './base-code-actions-provider';
import { Replacement } from 'sarif';
import { COMMANDS } from '../../constants';

class FixCodeActionsProvider extends BaseCodeActionsProvider<FixCodeAction> {
  public async provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContextExtended) {
    return this.getMonokleDiagnostics(context).filter((diagnostic: DiagnosticExtended) => diagnostic.result?.fixes?.length > 0).map((diagnostic: DiagnosticExtended) => {
      return new FixCodeAction(document, diagnostic);
    });
  }

  public async resolveCodeAction(codeAction: FixCodeAction) {
    codeAction.edit = new WorkspaceEdit();

    for(const fix of codeAction.result.fixes) {
      for(const change of fix.artifactChanges) {
        for(const replacement of change.replacements) {
          const {deletedRegion, insertedContent} = (replacement as Replacement);
          if(!deletedRegion.startLine) {continue;}
          const startLine = codeAction.document.lineAt(deletedRegion.startLine);
          const endLine = codeAction.document.lineAt(deletedRegion.endLine ?? deletedRegion.startLine);
          // range is from start line - column 0 to  endLine - column 0
          const range = new Range(startLine.range.start, endLine.range.start); 
          codeAction.edit.delete(codeAction.document.uri, range);

          if(insertedContent) {
            codeAction.edit.insert(codeAction.document.uri, startLine.range.start, insertedContent.text);
          }
        }
      } 
    }

    codeAction.command = {
      command: COMMANDS.TRACK,
      title: 'Track',
      arguments: ['code_action/fix', {status: 'success', ruleId: codeAction.result.ruleId}]
    };

    return codeAction;
  }
}

class FixCodeAction extends CodeAction {
  private readonly _document: TextDocument;
  private readonly _result: ValidationResultExtended;

  constructor(document: TextDocument, diagnostic: DiagnosticExtended) {
    super(`Fix "${diagnostic.result._rule.name} (${diagnostic.result._rule.id})"`, CodeActionKind.QuickFix);

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

export function registerFixCodeActionsProvider() {
  return languages.registerCodeActionsProvider({language: 'yaml'}, new FixCodeActionsProvider(), {
    providedCodeActionKinds: FixCodeActionsProvider.providedCodeActionKinds
  });
}
