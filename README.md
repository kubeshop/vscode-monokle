# Monokle VSC Extension

<p align="center">
  <img src="assets/icon.png" alt="Monokle Logo" width="128" height="128"/>
</p>

<p align="center">
  <a href="https://github.com/kubeshop/vscode-monokle" title="Monokle extension latest version">
    <img src="https://img.shields.io/github/package-json/v/kubeshop/vscode-monokle/main" />
  </a>
  <a href="https://github.com/kubeshop/vscode-monokle/actions/workflows/test.yaml" title="Monokle extension build status">
    <img src="https://img.shields.io/github/actions/workflow/status/kubeshop/vscode-monokle/test.yaml">
  </a>
  <a href="https://github.com/kubeshop/vscode-monokle/blob/main/LICENSE" title="Monokle extension license">
    <img src="https://img.shields.io/github/license/kubeshop/vscode-monokle">
  </a>
</p>

Monokle Visual Studio Code extensions let's you validate your Kubernetes resources directly in Visual Studio Code. It is a great complement to [Monokle Cloud](https://monokle.io), [Desktop](https://monokle.io/open-source) or [CLI](https://github.com/kubeshop/monokle-cli).

Monokle aims to help you write better Kubernetes deployments no matter your preferred way of working. You can now install our extension to fix your configuration directly while you are coding from the comfort of your Visual Studio Code.

As usual, misconfigurations are highlighted directly within your source code with a recommended remediation to fix them without being a Kubernetes expert. All misconfigurations are also listed as a summary in VSCode's problem pane, or within the SARIF viewer for additional information and filters.

By default, a [sensible policy](#default-validation-configuration) is used, or you can simply add a Monokle [validation configuration file](https://github.com/kubeshop/monokle-core/blob/main/packages/validation/docs/configuration.md) to your workspace to customize the rules.

This is **Technical Preview** release. We are open to any feedback and eager to improve the product together with our users and community. Feel free to drop us any questions, feature proposals and issues.

## Features

### Easily navigate through all errors and resources

Monokle validation panel allows you to easily see all validation errors grouped by resource or rule id, see each rule details and navigate to exact line in each resource where violation was detected.

<p align="center">
  <img src="assets/gifs/navigation.gif"/>
</p>

### See violations in `Problems` tab for opened resources

When navigating through resource files, you can see all violations in VSC build-in `Problems` tab.

<p align="center">
  <img src="assets/gifs/problems.gif"/>
</p>

### Get instant feedback on fixes

Validation runs in a background every time a file is modified and saved. This way you get instant feedback when applying fixes.

<p align="center">
  <img src="assets/gifs/realtime-validation.gif"/>
</p>

### Tailored to your needs

With dedicated `Monokle: Bootstrap configuration` command, you can customize validation configuration in seconds and adjust to your specific needs.

<p align="center">
  <img src="assets/gifs/configuration.gif"/>
</p>

### Runs with commands

Use command pallete to interact with extension, run validation, see current configuration and more.

* `Monokle: Validate` - runs validation of Kubernetes resources on demand.
* `Monokle: Show validation panel` - opens validation panel (this can be also done be clicking on Monokle status bar icon).
* `Monokle: Show configuration` - opens validation configuration file which is used as validation configuration for given project.
* `Monokle: Bootstrap configuration` - creates `monokle.validation.yaml` configuration file. It is a quick way to adjust validation config.
* `Monokle: Download policy` - downloads remote policy. This requires `monokle.remotePolicyUrl` to be configured.

## Default Validation Policy

The default configuration used for resource validation is written to a `monokle.validation.yaml` file
in your project folder. It enables the following validation plugins:
- **Security Policy** validation, based on Open-Policy-Agent rules from Aqua Security
- **Kubernetes Schema** validation for checking schema and Kubernetes version compliance
- **Resource Links** validation to ensure that all references between resources are valid
- **YAML syntax** validation 

Read about these plugins and their individual validation rules in the [Core Plugins documentation](https://github.com/kubeshop/monokle-core/blob/main/packages/validation/docs/core-plugins.md)

## Extension Settings

This extension contributes the following settings:

* `monokle.enable` - Enable/disable this extension.
* `monokle.configurationPath` - Set path to validation configuration file.
* `monokle.verbose` - Log runtime info to VSC Developer Console.
* `monokle.remotePolicyUrl` - Set Monokle Cloud URL to fetch policies from.

## Dependencies

A core component of Monokle extension and dependency is [`@monokle/validation` library](https://github.com/kubeshop/monokle-core/tree/main/packages/validation).

Monokle extension also uses [SARIF Viewer](https://marketplace.visualstudio.com/items?itemName=MS-SarifVSCode.sarif-viewer) extension as dependency. It should be installed automatically when installing Monokle extension.

## Questions and contributing

Feel free to drop any question related this extension in [GitHub Monokle discussions](https://github.com/kubeshop/monokle/discussions). If you found a bug or would like to request a new feature, report it as [GitHub issue](https://github.com/kubeshop/vscode-monokle/issues).

We are happy to help and assist you in case of any doubts or questions.

For contributing code see [CONTRIBUTING.md](https://github.com/kubeshop/vscode-monokle/blob/main/CONTRIBUTING.md) file.

## Release Notes

### 0.1.2

#### Fixes

* Updated validation library to [`v0.23.9`](https://github.com/kubeshop/monokle-core/releases/tag/%40monokle%2Fvalidation%400.23.9) version.

### 0.1.1

#### Fixes

* Fixed misaligned highlights after resource file is modified - [#1](https://github.com/kubeshop/vscode-monokle/issues/1).
* Fixed invalid `logger.debug` initial value.

### 0.1.0

Technical preview release of Monokle extension.
