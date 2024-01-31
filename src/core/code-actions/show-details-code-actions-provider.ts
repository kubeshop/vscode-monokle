import { CodeAction, CodeActionKind, TextDocument, Range, languages } from 'vscode';
import { BaseCodeActionsProvider, CodeActionContextExtended, DiagnosticExtended } from './base-code-actions-provider';
import { COMMANDS } from '../../constants';

class ShowDetailsCodeActionsProvider extends BaseCodeActionsProvider<ShowDetailsCodeAction> {
  public async provideCodeActions(_document: TextDocument, _range: Range, context: CodeActionContextExtended) {
    const monokleDiagnostics = this.getMonokleDiagnostics(context);

    if (!monokleDiagnostics.length) {
      [];
    }

    if (monokleDiagnostics.length === 1) {
      return [new ShowSingleDetailsCodeAction(monokleDiagnostics[0])];
    }

    return [new ShowAllDetailsCodeAction(monokleDiagnostics)];
  }

  public async resolveCodeAction(codeAction: ShowDetailsCodeAction) {
    const commands = [{
      command: COMMANDS.SHOW_PANEL,
      title: 'Show panel',
      arguments: [codeAction.firstResult._id]
    }, {
      command: COMMANDS.TRACK,
      title: 'Track',
      arguments: ['code_action/show_details', {status: 'success'}]
    }];

    codeAction.command = {
      command: COMMANDS.RUN_COMMANDS,
      title: 'Run commands',
      arguments: [commands]
    };

    return codeAction;
  }
}

class ShowDetailsCodeAction extends CodeAction {
  get firstResult() {
    return (this.diagnostics[0] as DiagnosticExtended).result;
  }
}

class ShowSingleDetailsCodeAction extends ShowDetailsCodeAction {
  constructor(diagnostic: DiagnosticExtended) {
    super(`Show details for "${diagnostic.result._rule.name} (${diagnostic.result._rule.id})" violation`, CodeActionKind.QuickFix);

    this.diagnostics = [diagnostic];
  }
}

class ShowAllDetailsCodeAction extends ShowDetailsCodeAction {
  constructor(diagnostics: DiagnosticExtended[]) {
    super(`Show details for these violations`, CodeActionKind.QuickFix);

    this.diagnostics = diagnostics;
  }
}

export function registerShowDetailsCodeActionsProvider() {
  return languages.registerCodeActionsProvider({language: 'yaml'}, new ShowDetailsCodeActionsProvider(), {
    providedCodeActionKinds: ShowDetailsCodeActionsProvider.providedCodeActionKinds
  });
}
