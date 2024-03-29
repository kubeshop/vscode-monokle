# Change Log

## 0.10.0

* Introduced support for globally managed suppressions (fingerprint-based suppressions) via `Suppress...` / `Request suppression...` quick actions.

## 0.9.1

### Other updates

* Introduced support for more rules from default security policy of RHACS.

## 0.9.0

### Features

* Introduced `Fix...` quick action. It allows to automatically fix most of misconfigurations.
* Introduced `Suppress...` quick action. It allows to suppress each rule within a single resource.
* Introduced `Show details...` quick action. It allows to navigate quickly to current misconfiguration in Violations panel.
* Introduced `monokle.automaticallyOpenPanel` configuration option. It allows to define when Violations panel should be shown automatically.

## 0.8.3

### Fixes

* Fixed [custom plugins](https://docs.monokle.com/tutorials/custom-policy-validate-memory-consumption/) fetching mechanism. Custom plugins are now working correctly.

## 0.8.2

### Fixes

* Added `User-Agent` header for every Monokle API request sent.

## 0.8.1

### Fixes

* Fixed extension to react on git branch changes and validate manifests automatically ([#70](https://github.com/kubeshop/vscode-monokle/issues/70)).

## 0.8.0

### Features

* Introduced support for suppressions (synchronized from Monokle Cloud/Enterprise).

### Fixes

* Fixed **Resource links** plugin mappings processing. Related rules and violations are now visible.

## 0.7.1

### Fixes

* Fixed helm directories recognition on Windows.

## 0.7.0

### Features

* Introduced `monokle.run` configuration which allows to define when yaml manifests should be revalidated - `onType` (default) or `onSave`.

### Fixes

* Added various performance improvements.
* Improved error handling and stability.

## 0.6.5

### Fixes

* Fixed `Monokle: Login` command to react correctly on canceling login request ([#66](https://github.com/kubeshop/vscode-monokle/issues/66)).

## 0.6.4

### Fixes

* Added request timeout to origin configuration request.

## 0.6.3

### Fixes

* Fixed origin URL normalization to use `https` as default protocol.
* Improved error messaging related to failed origin configuration fetch attempts.

## 0.6.2

### Fixes

* Improved error handling.

## 0.6.1

### Fixes

* Fixed status bar icon action to open validation panel on click.

## 0.6.0

### Important updates

* Migrated from [Microsoft Sarif Viewer](https://marketplace.visualstudio.com/items?itemName=MS-SarifVSCode.sarif-viewer) to [Monokle Sarif](https://marketplace.visualstudio.com/items?itemName=kubeshop.monokle-sarif) extension:
  * Fixed superfluous initialization prompts - [#16](https://github.com/kubeshop/vscode-monokle/issues/16).
  * Improved validation panle UI - [#7](https://github.com/kubeshop/vscode-monokle/issues/7).

> **IMPORTANT**: Since the SARIF dependency has changed, you may safely uninstall [Microsoft Sarif Viewer](https://marketplace.visualstudio.com/items?itemName=MS-SarifVSCode.sarif-viewer) if it is not used as standalone extension.

## 0.5.1

### Other updates

* Updated validation to use dynamic origin for Schemas Store to download resource schemas for validation with Kubernetes Schema plugin.
* Improved extensions initialization process.

## 0.5.0

### New Features

* Introduced `monokle.project` configuration option which allows to define remote project from which policy will be used.

### Fixes

* Fixed `monokle.eoverwriteRemotePolicyUrl` which did not have any effect before. Renamed as `monokle.origin`.
* Fixed `Monokle: Show configuration` command when it failed for remote projects without policy defined.

### Other updates

* Improved when validation pane appears on initialization and if no violations found.

## 0.4.1

### Fixes

* Restored default validation configuration and aligned it with `Monokle: Bootstrap configuration` command.

## 0.4.0

### New Features

* Monokle Cloud project name from which remote policy is used is now visible in the extension status bar icon tooltip - [#39](https://github.com/kubeshop/vscode-monokle/issues/39).

### Fixes

* Validation result panel will not reload unnecessarily - [#42](https://github.com/kubeshop/vscode-monokle/issues/42).
* Polished and simplified extension status bar icon behavior and appearance - [#41](https://github.com/kubeshop/vscode-monokle/issues/41).

### Other updates

* Removed token authentication method in `login` command flow in favor of device flow.
* Updated dependencies improving stability.

## 0.3.1

### Fixes

* Minor improvements and bugfixes related to Monokle Cloud integration.

## 0.3.0

### New Features

* Introduced authentication to Monokle Cloud via web browser (device flow).
* Introduced support for custom plugins.
* Introduced `monokle.telemetryEnabled` configuration options.

### Fixes

* Minor performance improvements and bugfixes.

### Other updates

* Added anonymous telemetry to help us improve the extension.

## 0.2.0

### New Features

* Introduced `Monokle: Login` command to allow logging in to Monokle Cloud with access token.
* Introduced `Monokle: Logout` command to allow logging out from Monokle Cloud.
* Introduced `Monokle: Synchronize` command to manually trigger remote policy synchronization from Monokle Cloud.
* Introduced `monokle.overwriteRemotePolicyUrl` configuration option to allow overwriting default Monokle Cloud URL used for authentication and policies fetching.

## 0.1.2

### Fixes

* Updated validation library to [`v0.23.9`](https://github.com/kubeshop/monokle-core/releases/tag/%40monokle%2Fvalidation%400.23.9) version.

## 0.1.1

### Fixes

* Fixed misaligned highlights after resource file is modified - [#1](https://github.com/kubeshop/vscode-monokle/issues/1).
* Fixed invalid `logger.debug` initial value.

## 0.1.0

Technical preview release of Monokle extension.
