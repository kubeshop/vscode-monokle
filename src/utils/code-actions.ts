import { parseAllDocuments, stringify } from 'yaml';
import { diffLines } from 'diff';
import { CodeAction, CodeActionContext, CodeActionKind, CodeActionProvider, TextDocument, Range, Diagnostic, WorkspaceEdit, Position, Uri } from 'vscode';
import { ValidationResult } from './validation';

type DiagnosticExtended = Diagnostic & {
  result: ValidationResult;
};

const MONOKLE_FINGERPRINT_FIELD = 'monokleHash/v1';

export class MonokleCodeActions implements CodeActionProvider {

  public static readonly providedCodeActionKinds = [
    CodeActionKind.QuickFix
  ];

  public async provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContext): Promise<CodeAction[]> {
    // Filter out diagnostic objects without Monokle fingerprint, because this it's not Monokle related diagnostics.
    const monokleDiagnostics = context.diagnostics.filter((diagnostic: DiagnosticExtended) => diagnostic?.result?.fingerprints?.[MONOKLE_FINGERPRINT_FIELD]);

    return monokleDiagnostics.map((diagnostic: DiagnosticExtended) => {
      return new AnnotationBasedSuppressionCodeAction(document, diagnostic);
    });
  }

  public async resolveCodeAction(codeAction: AnnotationBasedSuppressionCodeAction) {
    const parsedDocument = this.getParsedDocument(codeAction.document, codeAction.result);
    if (!parsedDocument) {
      return codeAction;
    }

    parsedDocument.activeResource.setIn(['metadata', 'annotations', `monokle.io/suppress.${codeAction.result.ruleId}`], 'suppress');

    codeAction.edit = this.generateWorkspaceEdit(parsedDocument.documents, parsedDocument.initialContent, codeAction.document.uri);

    return codeAction;
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
        // We can select new content with https://code.visualstudio.com/api/references/vscode-api#TextEditor
        edit.insert(documentUri, new Position(lines, chars), change.value);
      }

      if (change.removed) {
        // @TODO
      }

      // Calculate current position
      const linesChange = change.value.split('\n');
      const linesNr = linesChange.length - 1;

      lines += linesNr;
      chars = linesChange[linesNr].length;
    });

    return edit;
  }
}

class AnnotationBasedSuppressionCodeAction extends CodeAction {
  private readonly _document: TextDocument;
  private readonly _result: ValidationResult;

  constructor(document: TextDocument, diagnostic: DiagnosticExtended) {
    super(`Suppress "${diagnostic.message}" rule for this file`, CodeActionKind.QuickFix);

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
