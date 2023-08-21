
import { STATUS_BAR_TEXTS } from '../constants';
import { getTooltipContent } from './tooltip';
import { getAuthenticator } from './authentication';
import { getSynchronizer } from './synchronization';
import type { Disposable, ExtensionContext, StatusBarItem } from 'vscode';
import type { SarifWatcher } from './sarif-watcher';
import type { PolicyPuller } from './policy-puller';

export class RuntimeContext {
  private _disposableRegistry: Disposable[] = [];
  private _isValidating = false;

  constructor(
    private _extensionContext: ExtensionContext,
    private _sarifWatcher: SarifWatcher,
    private _policyPuller: PolicyPuller,
    private _authenticator: Awaited<ReturnType<typeof getAuthenticator>>,
    private _synchronizer: Awaited<ReturnType<typeof getSynchronizer>>,
    private _statusBarItem: StatusBarItem
  ) {}

  get extensionContext() {
    return this._extensionContext;
  }

  get sarifWatcher() {
    return this._sarifWatcher;
  }

  get policyPuller() {
    return this._policyPuller;
  }

  get authenticator() {
    return this._authenticator;
  }

  get synchronizer() {
    return this._synchronizer;
  }

  get statusBarItem() {
    return this._statusBarItem;
  }

  get isValidating() {
    return this._isValidating;
  }

  set isValidating(value: boolean) {
    this._isValidating = value;
    this._statusBarItem.text = value ? STATUS_BAR_TEXTS.VALIDATING : STATUS_BAR_TEXTS.DEFAULT;

    if (!value) {
      this.updateTooltip();
    }
  }

  async updateTooltip() {
    this._statusBarItem.tooltip = await getTooltipContent();
  }

  registerDisposables(disposables: Disposable[]) {
    this._disposableRegistry.push(...disposables);
  }

  async dispose() {
    const disposables = [...this._disposableRegistry];

    this._disposableRegistry = [];

    disposables.forEach(disposable => disposable.dispose());

    if (this.policyPuller) {
      await this.policyPuller.dispose();
    }

    if (this.sarifWatcher) {
      await this.sarifWatcher.dispose();
    }
  }
}
