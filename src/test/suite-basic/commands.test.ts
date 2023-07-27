import { ok } from 'assert';
import { commands } from 'vscode';
import { doSetup, doSuiteSetup, doSuiteTeardown } from '../helpers/suite';
import { COMMANDS } from '../../constants';

suite(`Basic - Commands: ${process.env.ROOT_PATH}`, () => {
  suiteSetup(async () => {
    await doSuiteSetup();
  });

  setup(async () => {
    await doSetup();
  });

  suiteTeardown(async () => {
    await doSuiteTeardown();
  });

  test('Exposes login command', async function() {
    const commandList = await commands.getCommands(false);
    ok(commandList.includes(COMMANDS.LOGIN));
  });

  test('Exposes logout command', async function() {
    const commandList = await commands.getCommands(false);
    ok(commandList.includes(COMMANDS.LOGOUT));
  });

  test('Exposes validate command', async function() {
    const commandList = await commands.getCommands(false);
    ok(commandList.includes(COMMANDS.VALIDATE));
  });

  test('Exposes showPanel command', async () => {
    const commandList = await commands.getCommands(false);
    ok(commandList.includes(COMMANDS.SHOW_PANEL));
  });

  test('Exposes showConfiguration command', async () => {
    const commandList = await commands.getCommands(false);
    ok(commandList.includes(COMMANDS.SHOW_CONFIGURATION));
  });

  test('Exposes bootstrap configuration command', async () => {
    const commandList = await commands.getCommands(false);
    ok(commandList.includes(COMMANDS.BOOTSTRAP_CONFIGURATION));
  });

  test('Exposes download policy command', async () => {
    const commandList = await commands.getCommands(false);
    ok(commandList.includes(COMMANDS.DOWNLOAD_POLICY));
  });
});
