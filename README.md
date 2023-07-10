# Monokle VSC Extension

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

<p align="center">
  <img src="assets/icon.png" alt="Monokle Logo" width="128" height="128"/>
</p>

Monokle Visual Studio Code extensions let's you validate your Kubernetes resources directly in Visual Studio Code. It is a great complement to [Monokle Cloud](https://monokle.io), [Desktop](https://monokle.io/open-source) or [CLI](https://github.com/kubeshop/monokle-cli).

Monokle aims to help you write better Kubernetes deployments no matter your preferred way of working. You can now install our extension to fix your configuration directly while you are coding from the comfort of your Visual Studio Code.

As usual, misconfigurations are highlighted directly within your source code with a recommended remediation to fix them without being a Kubernetes expert. All misconfigurations are also listed as a summary in VSCode's problem pane, or within the SARIF viewer for additional information and filters.

By default, a sensible policy is used or you can simply add a Monokle validation configuration file to your workspace to customize the rules.

This is **Technical Preview** release. We are open to any feedback and eager to improve the product together with our users and community. Feel free to drop us any questions, feature proposals and issues.

## Features

Monokle extension will automatically validate all Kuberentes resources in current project / workspace on Visual Studio Code start and show the panel with the list of all warning and errors. Validation errors will also appear in VSC **Problems** tab for currently opened resource files.

All resource files are also validated when modified (after being saved) and list in validation panel refreshes automatically.

Monokle extension exposes following commands:

* `Monokle: Validate` - runs validation of Kubernetes resources on demand and shows validation panel.
* `Monokle: Show validation panel` - opens validation panel (this can be also done be clicking on Monokle status bar icon).
* `Monokle: Show configuration` - opens validation configuration file which is used as validation configuration for given project.
* `Monokle: Bootstrap configuration` - creates `monokle.validation.yaml` configuration file. It is a quick way to adjust validation config.

## Extension Settings

This extension contributes the following settings:

* `monokle.enable`: Enable/disable this extension.
* `monokle.configurationPath`: Set path to validation configuration file.
* `monokle.verbose`: Log runtime info to VSC Developer Console.

## Dependencies

A core component of Monokle extension and dependency is [`@monokle/validation` library](https://github.com/kubeshop/monokle-core/tree/main/packages/validation).

Monokle extension also uses [SARIF Viewer](https://marketplace.visualstudio.com/items?itemName=MS-SarifVSCode.sarif-viewer) extension as dependency. It should be installed automatically when installing Monokle extension.

## Questions and contributing

Feel free to drop any question related this extension in [GitHub Monokle discussions](https://github.com/kubeshop/monokle/discussions). If you found a bug or would like to request a new feature, report it as [GitHub issue](https://github.com/kubeshop/vscode-monokle/issues).

We are happy to help and assist you in case of any doubts or questions.

For contributing code see [CONTRIBUTING.md](https://github.com/kubeshop/vscode-monokle/CONTRIBUTING.md) file.

## Release Notes

### 0.1.0

Technical preview release of Monokle extension.
