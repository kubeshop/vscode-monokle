
import { STATUS_BAR_TEXTS } from '../constants';
import { getTooltipContent } from './tooltip';
import type { Disposable, ExtensionContext, StatusBarItem } from 'vscode';
import type { SarifWatcher } from './sarif-watcher';
import type { PolicyPuller } from './policy-puller';

export class RuntimeContext {
  private _extensionContext: ExtensionContext;
  private _sarifWatcher: SarifWatcher;
  private _policyPuller: PolicyPuller;
  private _statusBarItem: StatusBarItem;
  private _disposableRegistry: Disposable[] = [];
  private _isValidating = false;

  constructor(extensionContext: ExtensionContext, sarifWatcher: SarifWatcher, policyPuller: PolicyPuller, statusBarItem: StatusBarItem) {
    this._extensionContext = extensionContext;
    this._sarifWatcher = sarifWatcher;
    this._policyPuller = policyPuller;
    this._statusBarItem = statusBarItem;
  }

  get extensionContext() {
    return this._extensionContext;
  }

  get sarifWatcher() {
    return this._sarifWatcher;
  }

  get policyPuller() {
    return this._policyPuller;
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
      this.updateTooltipContent();
    }
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

  private async updateTooltipContent() {
    this._statusBarItem.tooltip = await getTooltipContent();
  }
}
