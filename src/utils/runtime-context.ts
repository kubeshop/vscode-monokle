import type { Disposable, ExtensionContext } from 'vscode';
import type { SarifWatcher } from './sarif-watcher';

export class RuntimeContext {
  private _extensionContext: ExtensionContext;
  private _disposableRegistry: Disposable[] = [];
  private _sarifWatcher: SarifWatcher;

  constructor(extensionContext: ExtensionContext, sarifWatcher: SarifWatcher) {
    this._extensionContext = extensionContext;
    this._sarifWatcher = sarifWatcher;
  }

  get extensionContext() {
    return this._extensionContext;
  }

  get sarifWatcher() {
    return this._sarifWatcher;
  }

  get disposables() {
    return [...this._disposableRegistry];
  }

  registerDisposables(disposables: Disposable[]) {
    this._disposableRegistry.push(...disposables);
  }
}
