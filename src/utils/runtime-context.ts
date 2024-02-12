
import { STATUS_BAR_TEXTS } from '../constants';
import { getTooltipData } from './tooltip';
import type { Authenticator } from './authentication';
import type { Synchronizer } from './synchronization';
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
    private _authenticator: Authenticator | undefined,
    private _synchronizer: Synchronizer | undefined,
    private _statusBarItem: StatusBarItem
  ) {}

  get isLocal() {
    return !this._authenticator || !this._synchronizer;
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

    if (!value) {
      this.updateTooltip();
    }
  }

  async refreshPolicyPuller(force = false) {
    if (!this.policyPuller) {
      return;
    }

    await this.policyPuller.refresh(force);
  }

  async reconfigure(
    policyPuller: PolicyPuller,
    authenticator: Authenticator,
    synchronizer: Synchronizer,
  ) {
    if (this.policyPuller) {
      await this.policyPuller.dispose();
    }

    if (this.authenticator) {
      this.authenticator.removeAllListeners();
    }

    if (this.synchronizer) {
      this.synchronizer.removeAllListeners();
    }

    this._policyPuller = policyPuller;
    this._authenticator = authenticator;
    this._synchronizer = synchronizer;
  }

  localOnly() {
    this._policyPuller = undefined;
    this._authenticator = undefined;
    this._synchronizer = undefined;
  }

  async updateTooltip() {
    const tooltipData = await getTooltipData();
    this._statusBarItem.text = tooltipData.status === 'ok' ? STATUS_BAR_TEXTS.DEFAULT : STATUS_BAR_TEXTS.ERROR;
    this._statusBarItem.tooltip = tooltipData.content;
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

    if (this.authenticator) {
      this.authenticator.removeAllListeners();
    }

    if (this.synchronizer) {
      this.synchronizer.removeAllListeners();
    }
  }
}
