import { parseAllDocuments, stringify } from 'yaml';
import { diffLines } from 'diff';
import { CodeAction, CodeActionContext, CodeActionKind, CodeActionProvider, TextDocument, Range, Diagnostic, WorkspaceEdit, Position, Uri } from 'vscode';
import { ValidationResult, ValidationRule } from './../../utils/validation';

export type ValidationResultExtended = ValidationResult & {
  _id: [string, number, number];
  _rule: ValidationRule;
  _uri: string;
};

export type DiagnosticExtended = Diagnostic & {
  result: ValidationResultExtended;
};

export interface CodeActionContextExtended extends CodeActionContext {
  diagnostics: DiagnosticExtended[];
};

export const MONOKLE_FINGERPRINT_FIELD = 'monokleHash/v1';

export abstract class BaseCodeActionsProvider<T_ACTION extends CodeAction> implements CodeActionProvider<T_ACTION> {

  public static readonly providedCodeActionKinds = [
    CodeActionKind.QuickFix
  ];

  public abstract provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContextExtended): Promise<T_ACTION[]>;

  public abstract resolveCodeAction(codeAction: T_ACTION);

  protected getMonokleDiagnostics(context: CodeActionContextExtended) {
    // Filter out diagnostic objects without Monokle fingerprint, because this is not Monokle related diagnostics.
    const monokleDiagnostics = context.diagnostics.filter(diagnostic => diagnostic?.result?.fingerprints?.[MONOKLE_FINGERPRINT_FIELD]);

    return this.getUniqueDiagnosticsByRule(monokleDiagnostics);
  }

  protected getParsedDocument(document: TextDocument, result: ValidationResult) {
    const initialContent = document.getText();
    const documents = parseAllDocuments(initialContent);

    if (documents.length === 0) {
      return undefined;
    }

    let activeDocumentIndex = -1;
    if (documents.length === 1) {
      activeDocumentIndex = 0;
    } else {
      const resultLocation = result.locations[1].logicalLocations?.[0]?.fullyQualifiedName;
      const [name, kind] = resultLocation.split('@').shift().split('.');

      activeDocumentIndex = documents.findIndex((document) => {
        return (document.getIn(['metadata', 'name']) as string || '') === name &&
          (document.get('kind') as string || '').toLowerCase() === kind;
      });
    }

    if (activeDocumentIndex === -1) {
      return undefined;
    }

    return {
      initialContent,
      documents,
      activeResource: documents[activeDocumentIndex],
    };
  }

  protected generateWorkspaceEdit(allDocuments: ReturnType<typeof parseAllDocuments>, initialContent: string, documentUri: Uri) {
    const newContent = allDocuments.map((document) => stringify(document)).join('---\n');

    const edit = new WorkspaceEdit();
    const changes = diffLines(initialContent, newContent);

    let lines = 0;
    let chars = 0;
    changes.forEach((change) => {
      if (change.added) {
        edit.insert(documentUri, new Position(lines, chars), change.value);
      }

      if (change.removed) {
        // @TODO
        // Not needed for annotation based suppressions (because we only adding here).
        // Will be needed for other edits which can remove content too.
      }

      // Calculate current position.
      const linesChange = change.value.split('\n');
      const linesNr = linesChange.length - 1;

      lines += linesNr;
      chars = linesChange[linesNr].length;
    });

    return edit;
  }

  protected getUniqueDiagnosticsByRule(diagnostics: DiagnosticExtended[]): DiagnosticExtended[] {
    return Object.values(
      diagnostics.reduce((acc, diagnostic) => {
        acc[diagnostic.result.ruleId] = diagnostic;
        return acc;
      }, {})
    );
  }
}
