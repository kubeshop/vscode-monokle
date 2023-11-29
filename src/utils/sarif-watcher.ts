import { extensions } from 'vscode';
import type { Uri } from 'vscode';

export class SarifWatcher {
  private _uris: Uri[] = [];

  async add(uri: Uri) {
    const index = this._uris.findIndex(u => u.path === uri.path);

    if (index === -1) {
      const sarifApi = await this.getSarifApi();
      this._uris.push(uri);
      return sarifApi.openLogs([uri]);
    }
  }

  async remove(uri: Uri) {
    const index = this._uris.findIndex(u => u.path === uri.path);

    if (index !== -1) {
      const sarifApi = await this.getSarifApi();
      this._uris.splice(index, 1);
      return sarifApi.closeLogs([uri]);
    }
  }

  async replace(uris: Uri[]) {
    const removed = this._uris.filter(u => !uris.find(u2 => u2.path === u.path));
    const added = uris.filter(u => !this._uris.find(u2 => u2.path === u.path));
    const sarifApi = await this.getSarifApi();

    this._uris = [...uris];

    if (removed.length) {
      return sarifApi.closeLogs(removed);
    }

    if (added.length) {
      return sarifApi.openLogs(added);
    }
  }

  async dispose() {
    const sarifApi = await this.getSarifApi();
    this._uris = [];
    return sarifApi.closeAllLogs();
  }

  protected async getSarifApi() {
    const sarifExtension = extensions.getExtension('Kubeshop.monokle-sarif');

    if (!sarifExtension.isActive) {
      await sarifExtension.activate();
    }

    return sarifExtension.exports;
  }
}
