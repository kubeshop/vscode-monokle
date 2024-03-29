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

Monokle Visual Studio Code extensions let's you validate your Kubernetes resources directly in Visual Studio Code. It is a great complement to [Monokle Cloud](https://monokle.io), [Desktop](https://monokle.io/open-source) or [CLI](https://github.com/kubeshop/monokle-cli).

Monokle aims to help you write better Kubernetes deployments no matter your preferred way of working. You can now install our extension to fix your configuration directly while you are coding from the comfort of your Visual Studio Code.

As usual, misconfigurations are highlighted directly within your source code with a recommended remediation to fix them without being a Kubernetes expert. All misconfigurations are also listed as a summary in VSCode's problem pane, or within the SARIF viewer for additional information and filters.

By default, a [sensible policy](#default-validation-configuration) is used, or you can simply add a Monokle [validation configuration file](https://github.com/kubeshop/monokle-core/blob/main/packages/validation/docs/configuration.md) to your workspace to customize the rules.

This is **Technical Preview** release. We are open to any feedback and eager to improve the product together with our users and community. Feel free to drop us any questions, feature proposals and issues.

## Features

### Validate your resources in a blink of an eye

Monokle extension runs in a background and validates all resources within your workspace in real-time. After installing the extension, default policy is used so you are ready to go!

Policy can be changed using [`Monokle: Bootstrap configuration` command](#adjust-to-your-needs) or by [connecting to Monokle Cloud](#monokle-cloudenterprise-integration-setup) to use centralized policy.

### Fix your resources with ease

You can fix most of the problems with Autofix quick action! Just open a quick fix panel and apply "Fix..." action.

<p align="center">
  <img src="assets/gifs/autofixes.gif"/>
</p>

### Easily navigate through all errors and resources

Monokle validation panel allows you to easily see all validation errors grouped by resource or rule id, see rule details and navigate to exact line in each resource where violation was detected.

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

### Suppress specific rules for any resource

You can suppress rules for specific resources via "Suppress..." quick fix action. This instructs Monokle extension that the resource is the way you wanted and ignore the rule for this specific resource.

<p align="center">
  <img src="assets/gifs/suppress.gif"/>
</p>

### Adjust to your needs

With dedicated `Monokle: Bootstrap configuration` command, you can customize validation configuration in seconds and adjust to your specific needs.

<p align="center">
  <img src="assets/gifs/configuration.gif"/>
</p>

### Enforce policies with Monokle Cloud and Monokle Enterprise

Quickly define and manage polices in Monokle Cloud or self-hosted Monokle Enterprise which will be used for anyone working with the project in VSC.

#### Configure policies easily with Monokle

<p align="center">
  <img src="assets/gifs/remote-policy-config.gif"/>
</p>

#### Synchronizes automatically and with single command

<p align="center">
  <img src="assets/gifs/remote-policy-sync.gif"/>
</p>

#### Manage suppressions globally

When connected to Monokle Cloud or self-hosted Monokle Enterprise you can suppress any misconfiguration directly from VSCode using `Suppress...` / `Request suppression...` quick action. These suppressions are synchronized and can be managed globally from Monokle Cloud and Monokle Enterprise.

<p align="center">
  <img src="assets/gifs/cloud-suppress.gif"/>
</p>

See [**Monokle Cloud/Enterprise integration setup** section](#monokle-cloudenterprise-integration-setup) below on how to configure it.

### Runs with commands

Use command palette to interact with extension, run validation, see current configuration and more.

* `Monokle: Validate` - runs validation of Kubernetes resources on demand.
* `Monokle: Synchronize` - synchronizes remote policy from Monokle Cloud.
* `Monokle: Login` - logins to Monokle Cloud.
* `Monokle: Logout` - logouts from Monokle Cloud.
* `Monokle: Show validation panel` - opens validation panel (this can be also done be clicking on Monokle status bar icon).
* `Monokle: Show configuration` - opens validation configuration file which is used as validation configuration for given project.
* `Monokle: Bootstrap configuration` - creates `monokle.validation.yaml` configuration file. It is a quick way to adjust validation config.

## Default Validation Policy

The default configuration used for resource validation enables the following validation plugins:
- **Pod Security Standard** validation, based on the corresponding standard from the Kubernetes project.
- **Kubernetes Schema** validation for checking schema and Kubernetes version compliance.
- **Resource Links** validation to ensure that all references between resources are valid.
- **YAML syntax** validation.

Read about these plugins and their individual validation rules in the [Core Plugins documentation](https://github.com/kubeshop/monokle-core/blob/main/packages/validation/docs/core-plugins.md).

To customize default configuration you can run `Monokle: Bootstrap validation` command to generate local `monokle.validation.yaml` configuration file in your project folder or connect with remote policy with Monokle Cloud.

## Monokle Cloud/Enterprise integration setup

To use remote policy with Monokle extension you will need to create a project and configure policy for it in Monokle Cloud. Start by signing in to [Monokle Cloud](https://app.monokle.com).

> **IMPORTANT**: The steps are the same for Monokle Enterprise. The main difference is that `monokle.origin` configuration needs to be changed to point to Enterprise instance (web app URL).

> In case of doubts, refer to [Getting Started Guide](https://docs.monokle.com/tutorials/getting-started) or hit us directly on [Discord](https://discord.com/invite/6zupCZFQbe).

### Project setup

After signing up, start by creating a project on [Projects page](https://app.monokle.com/dashboard/projects):

<p align="center">
  <img src="assets/images/projects.png"/>
</p>

### Add your repository to your project

After project is created, add a repository (the one you will be working locally with) to a project. This can be done by going to `Repositories` tab in project view and using `Add repository` button:

<p align="center">
  <img src="assets/images/repos.png"/>
</p>

### Policy setup

The last step is policy setup. You can use policy wizard by going to `Policy` tab in project view:

<p align="center">
  <img src="assets/images/policies.png"/>
</p>

### Synchronize

After the setup is done, you can run `Monokle: Synchronize` command to speed-up initial policy fetching and get the validation going.

## Extension Settings

This extension contributes the following settings:

* `monokle.run` - Run resource validation when typing (`onType`) or only when file is saved (`onSave`).
* `monokle.automaticallyOpenPanel` - Open **Violations** panel automatically when project is opened (`onProjectOpen`) or never (`never`).
* `monokle.configurationPath` - Set path to external validation configuration file.
* `monokle.project` - Define remote project from which policy should be used for validation.
* `monokle.origin` - Overwrite default Monokle Cloud URL (e.g. when running own Monokle Enterprise instance).
* `monokle.enabled` - Enable/disable this extension.
* `monokle.telemetryEnabled` - Enable/disable anonymous telemetry.
* `monokle.verbose` - Log runtime information to VSC Developer Console.

> **IMPORTANT**: Project slug used for `monokle.project` can be found in `Project` > `Settings` tab in a `Project slug` field.

## Dependencies

A core component of Monokle extension and dependency is [`@monokle/validation` library](https://github.com/kubeshop/monokle-core/tree/main/packages/validation).

Monokle extension depends on [Monokle SARIF Viewer](https://marketplace.visualstudio.com/items?itemName=Kubeshop.monokle-sarif) extension. It should be installed automatically when installing Monokle extension.

## Questions and contributing

Feel free to drop any question related this extension in [GitHub Monokle discussions](https://github.com/kubeshop/monokle/discussions). If you found a bug or would like to request a new feature, report it as [GitHub issue](https://github.com/kubeshop/vscode-monokle/issues).

We are happy to help and assist you in case of any doubts or questions.

For contributing code see [CONTRIBUTING.md](https://github.com/kubeshop/vscode-monokle/blob/main/CONTRIBUTING.md) file.
