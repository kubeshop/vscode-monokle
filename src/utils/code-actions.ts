import { CodeAction, CodeActionContext, CodeActionKind, CodeActionProvider, TextDocument, Range, Diagnostic, DiagnosticSeverity } from 'vscode';
import { getWorkspaceFolders } from './workspace';
import { isSubpath } from './file-parser';
import { getValidationResultForRoot } from './validation';
import { relative } from 'path';

type Region = {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number;
};

// Maybe we should have separate provider for each action type, so they can be easily enabled/disabled.
export class MonokleCodeActions implements CodeActionProvider {

  public static readonly providedCodeActionKinds = [
    CodeActionKind.QuickFix
  ];

  // This is run on file open (when it has problems), on problem click, on problem hover, on action panel show
  // It provides document and range of the problem (entire highlighted area + user selection)
  // It also provides context with all diagnostics for the document
  // Diagnostic is an object holding problem data - severity, message (which is rule message in our case) and range
  //
  // For Monokle we need to:
  // for each diagnostics item try to find it in sarif results by
  //   - filtering by file path (remember that SARIF stores paths relative to the workspace root)
  //   - filtering by severity
  //   - filtering by message
  //   - filtering by overlapping start/end of selection
  //
  // With this we know which exact result it is in SARIF output.
  public async provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext): Promise<CodeAction[]> {
    console.log('provideCodeActions', document, range, context);

    const matchingRules = await this.findMatchingRules(document, context.diagnostics);

    console.log('matchingRules', matchingRules);

    // Based on matching rules we can create CodeAction objects for result x action
    return matchingRules.map(rule => {
      return new AutofixCodeAction(document, context.diagnostics[0], rule);
    });
  }

  // This is run when:
  // - user hovers code action (in quickfix panel)
  // - user clicks (applies) code action
  // See https://github.com/microsoft/vscode/issues/156978#issuecomment-1204118433
  //
  // This means the action resolution should be implemented either as codeAction.command or codeAction.edit (or both).
  // This is the function to precalculate additional data needed for an action. Also WorkspaceEdit can be created here.
  //
  // If CodeAction already has an edit (e.g. initiated in provideCodeActions) then it will not be run:
  // > Given a code action fill in its edit-property. Changes to all other properties, like title, are ignored.
  // > A code action that has an edit will not be resolved.
  //
  // This is executed less frequently than provideCodeActions so it's better place for calculations to not waste resources if the CodeAction will never be applied.
  // Still, looks like every user actions (hover, click) will trigger this function each time so either it should be fast or cached.
  public async resolveCodeAction(codeAction: AutofixCodeAction) {
    console.log('resolveCodeAction', codeAction);

    return codeAction;
  }

  // This is how we can map diagnostics object to SARIF results
  private async findMatchingRules(document: TextDocument, diagnostics: readonly Diagnostic[]): Promise<any[]> {
    const workspaceFolders = getWorkspaceFolders();
    const ownerWorkspace = workspaceFolders.find(folder => isSubpath(folder.uri, document.uri.fsPath));

    if (!ownerWorkspace) {
      return [];
    }

    const result = await getValidationResultForRoot(ownerWorkspace);

    if (!result) {
      return [];
    }

    const documentLocationRootRelative = relative(ownerWorkspace.uri.fsPath, document.uri.fsPath);

    console.log('documentLocationRootRelative', documentLocationRootRelative);

    const matchingRules = [];
    for (const run of result.runs) {
      const filteredResults = run.results.filter(violation => {
        return violation.locations[0].physicalLocation.artifactLocation.uri === documentLocationRootRelative;
      });

      for (const diagnostic of diagnostics) {
        let diagnosticSeverity = undefined;
        if (diagnostic.severity === DiagnosticSeverity.Error) {
          diagnosticSeverity = 'error';
        } else if (diagnostic.severity === DiagnosticSeverity.Warning) {
          diagnosticSeverity = 'warning';
        }

        // We are interested only in errors and warnings
        if (!diagnosticSeverity) {
          continue;
        }

        const matchingResults = filteredResults.filter(result => {
          return result.level === diagnosticSeverity &&
            result.message.text === diagnostic.message &&
            this.areLocationsIntersecting(result.locations[0].physicalLocation.region, diagnostic.range);
        });

        if (matchingResults.length) {
          matchingRules.push(...matchingResults);
        }
      }
    }

    return matchingRules;
  }

  private areLocationsIntersecting(_region: Region, _range: Range) {
    // @TODO
    return true;
  }
}

// Sample code action.
class AutofixCodeAction extends CodeAction {
  constructor(_document: TextDocument, diagnostic: Diagnostic, violation: any) {
    super(`Autofix "${violation.message.text}"`, CodeActionKind.QuickFix);
    this.diagnostics = [diagnostic];

    // If action provides both command and edit, edit will be run first and then command.
    // Sample command
    // this.command = {
    //   command: 'monokle.autofix',
    //   title: 'Autofix this issue',
    //   tooltip: 'Command tooltip',
    //   arguments: [diagnostic],
    // };

    // Sample edit
    // this.edit = new WorkspaceEdit();
    // this.edit.replace(document.uri, diagnostic.range, 'replacement text');

    console.log('ResultQuickFix', this);
  }
}
