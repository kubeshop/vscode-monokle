
import { STATUS_BAR_TEXTS } from '../constants';
import type { Disposable, ExtensionContext, StatusBarItem } from 'vscode';
import type { SarifWatcher } from './sarif-watcher';

export class RuntimeContext {
  private _extensionContext: ExtensionContext;
  private _sarifWatcher: SarifWatcher;
  private _statusBarItem: StatusBarItem;
  private _disposableRegistry: Disposable[] = [];
  private _isValidating = false;

  constructor(extensionContext: ExtensionContext, sarifWatcher: SarifWatcher, statusBarItem: StatusBarItem) {
    this._extensionContext = extensionContext;
    this._sarifWatcher = sarifWatcher;
    this._statusBarItem = statusBarItem;
  }

  get extensionContext() {
    return this._extensionContext;
  }

  get sarifWatcher() {
    return this._sarifWatcher;
  }

  get statusBarItem() {
    return this._statusBarItem;
  }

  get disposables() {
    return [...this._disposableRegistry];
  }

  get isValidating() {
    return this._isValidating;
  }

  set isValidating(value: boolean) {
    this._isValidating = value;
    this._statusBarItem.text = value ? STATUS_BAR_TEXTS.VALIDATING : STATUS_BAR_TEXTS.DEFAULT;
  }

  registerDisposables(disposables: Disposable[]) {
    this._disposableRegistry.push(...disposables);
  }
}
