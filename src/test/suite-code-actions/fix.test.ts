import { deepEqual, equal, fail, notEqual, ok } from 'assert';
import { workspace, Uri, Range, window as vscodeWindow, CodeActionKind, } from 'vscode';
import { resolve, } from 'path';
import { getWorkspaceFolders } from '../../utils/workspace';
import { doSuiteSetup, doSuiteTeardown, runForFolders } from '../helpers/suite';
import { assertValidationResults, waitForCodeActionList, waitForValidationResults } from '../helpers/asserts';
import { createCodeActionEdit } from '../../core';
import { Fix } from 'sarif';
import { removeValidationResult } from '../../utils/validation';

const RUN_ON = process.env.MONOKLE_TEST_VALIDATE_ON_SAVE === 'Y' ? 'onSave' : 'onType';

function getMisconfigurations(validationResponse) {
  return validationResponse.runs[0].results ?? [];
}

function getFixes(validationResponse): Fix[] {
  return getMisconfigurations(validationResponse)[0].fixes ?? [];
}

async function getRange(validationResponse): Promise<Range> {
  const { getFileLocation } = await import('@monokle/validation');
  const misconfiguration = getMisconfigurations(validationResponse)[0];
  const { startLine, startColumn, endLine, endColumn } = getFileLocation(misconfiguration).physicalLocation?.region;
  // line is 0 index based
  return new Range(startLine - 1, startColumn, endLine - 1, endColumn);
}



suite(`CodeActions - quick fix (${RUN_ON}): ${process.env.ROOT_PATH}`, async function () {
  this.timeout(25000);
  const isDisabled = process.env.WORKSPACE_DISABLED === 'true';


  suiteSetup(async function () {
    await doSuiteSetup();

    if (isDisabled) {
      this.skip();
    }
  });

  suiteTeardown(async () => {
    await doSuiteTeardown();
  });


  test('Fix is available in the CodeAction quickfix list', async function () {
    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      try {
        const file = resolve(folder.uri.fsPath, 'deployment.yaml');
        const uri = Uri.file(file);

        const validationResponse = await waitForValidationResults(folder);
        assertValidationResults(validationResponse);

        const range = await getRange(validationResponse);
        const document = await workspace.openTextDocument(uri);
        await vscodeWindow.showTextDocument(document);
        const codeActions = await waitForCodeActionList(uri, range, 2, 5000);

        if (!codeActions.find(({ kind, title }) => {
          return kind.value === CodeActionKind.QuickFix.value && title.includes('KBP104');
        })) {
          fail('Quick fix missing');
        }

      } catch (error) {
        fail(error.message);
      }
    });
  });

  test('Generates correct CodeAction edits', async function () {
    const folders = getWorkspaceFolders();

    await runForFolders(folders, async (folder) => {
      try {
        const file = resolve(folder.uri.fsPath, 'deployment.yaml');
        const uri = Uri.file(file);

        const initialValidationResponse = await waitForValidationResults(folder);
        assertValidationResults(initialValidationResponse);

        const document = await workspace.openTextDocument(uri);
        const intialText = document.getText();

        ok(intialText.includes('runAsUser: 300') &&
          !intialText.includes('runAsUser: 10001'), 'Unexpected initial content');
        const edit = createCodeActionEdit(getFixes(initialValidationResponse), document);
        const editSuccessful = await workspace.applyEdit(edit);

        if (!editSuccessful) {
          fail('Failed to apply fix');
        }

        const editedText = document.getText();
        notEqual(intialText, editedText, 'Contents identical');
        ok(!editedText.includes('runAsUser: 300') &&
          editedText.includes('runAsUser: 10001'), 'Fix not applied');

        await removeValidationResult(folder);

        const validationResponse = await waitForValidationResults(folder);
        assertValidationResults(validationResponse);

        // No misconfigurations!
        deepEqual(getMisconfigurations(validationResponse), []);

      } catch (error) {
        fail(error.message);
      }
    });
  });
});
