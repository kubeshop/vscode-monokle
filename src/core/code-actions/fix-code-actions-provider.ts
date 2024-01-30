import { CodeAction, CodeActionKind, TextDocument, Range, languages, WorkspaceEdit, commands } from 'vscode';
import { BaseCodeActionsProvider, CodeActionContextExtended, DiagnosticExtended, ValidationResultExtended } from './base-code-actions-provider';
import { Fix, Replacement } from 'sarif';
import { COMMANDS } from '../../constants';
import globals from '../../utils/globals';
import { raiseWarning } from '../../utils/errors';
import { trackEvent } from '../../utils/telemetry';


class FixCodeActionsProvider extends BaseCodeActionsProvider<FixCodeAction> {
  private _warning: Promise<unknown> | null;

  public async provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContextExtended) {
    return this.getMonokleDiagnostics(context).filter((diagnostic: DiagnosticExtended) => diagnostic.result?.fixes?.length > 0).map((diagnostic: DiagnosticExtended) => {
      return new FixCodeAction(document, diagnostic);
    });
  }

  public async resolveCodeAction(codeAction: FixCodeAction) {
    const user = await globals.getUser();

    if (!user.isAuthenticated) {
      if (!this._warning) {
        this._warning = raiseWarning(`Fix requires authentication.`, [{
          title: 'Login',
          callback() {
            commands.executeCommand(COMMANDS.LOGIN);
          },
        }]).then(() => this._warning = null);

        trackEvent('code_action/fix', {
          status: 'cancelled',
          error: 'Unauthenticated'
        });
      }

    } else {
      codeAction.edit = createCodeActionEdit(codeAction.result.fixes, codeAction.document);
      codeAction.command = {
        command: COMMANDS.TRACK,
        title: 'Track',
        arguments: ['code_action/fix', { status: 'success', ruleId: codeAction.result.ruleId }]
      };
    }

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
  return languages.registerCodeActionsProvider({ language: 'yaml' }, new FixCodeActionsProvider(), {
    providedCodeActionKinds: FixCodeActionsProvider.providedCodeActionKinds
  });
}


export function createCodeActionEdit(fixes: Fix[], document: TextDocument) {
  const edit = new WorkspaceEdit();

  for (const fix of fixes) {
    for (const change of fix.artifactChanges) {
      for (const replacement of change.replacements) {
        const { deletedRegion, insertedContent } = (replacement as Replacement);
        if (!deletedRegion.startLine) { continue; }
        const startLine = document.lineAt(deletedRegion.startLine);
        const endLine = document.lineAt(deletedRegion.endLine ?? deletedRegion.startLine);
        // range is from start line - column 0 to  endLine - column 0
        const range = new Range(startLine.range.start, endLine.range.start);
        edit.delete(document.uri, range);

        if (insertedContent) {
          edit.insert(document.uri, startLine.range.start, insertedContent.text);
        }
      }
    }
  }

  return edit;
}
