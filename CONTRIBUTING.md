## Developing

As an introduction to VSC extensions development, please refer to [vsc-extension-quickstart.md](vsc-extension-quickstart.md) file.

You can explore the code starting from `src/extension.ts`.

Available commands:

```bash
npm run compile  # Builds extension code.
npm run watch    # Watches and rebuilds sources on every change.
npm run test     # Runs tests.
npm run test:cc  # Runs tests with code coverage.
```

The easiest way to start development is to run `Watch and Run Extension` task. This way you can iterate quickly.

## Testing

To run tests:

```bash
npm run test     # Runs tests.
npm run test:cc  # Runs tests with code coverage.
```

If you are in a GUI-less environment (like CI runner or WSL), you can use:

```bash
DONT_PROMPT_WSL_INSTALL=1 xvfb-run -a npm run test
```

For manual testing you can test in development mode by running `Watch and Run Extension` task. You can also pack and install the extension by running:

```bash
vsce package
```

And then using _Install from VSIX_ option in VSC.

## Releasing

Most of the release process is done automatically through GitHub CI. However it requires few manual steps:

1. Make sure you are on `main` branch and have latest changes and no local modifications:

```bash
git checkout main
git fetch --all
git reset --hard origin/main
```

2. Update `CHANGELOG.md` file and `Release Notes` section of `README.md` with release info (if needed) and push to `main` branch.

3. Run `npm version [patch|minor|major]` to bump package version and push (`main` and tag) to remote:

```bash
npm version patch
git push origin main
git push origin vA.B.C
```

Pushing a tag to remote triggers release process (see `release.yaml` workflow file), which publishes
to VSC marketplace and creates GitHub release.

You can verify the release by:

* Looking on the [Marketplace page](https://marketplace.visualstudio.com/items?itemName=kubeshop.monokle) to see if latest release is there.
* Looking on GitHub [release list](https://github.com/kubeshop/vscode-monokle/releases) to see if latest release is there.

### Manual publication

> If for any reason you need to release manually, see steps below.

Releasing requires [`@vscode/vsce`](https://www.npmjs.com/package/@vscode/vsce) package installed.

**IMPORTANT**: To keep telemetry working, before running any `vsce` command, please update `SEGMENT_API_KEY` in `src/config.ts` to correct value for a time of building the extension (DO NOT COMMIT THOUGH!).

After that, run:

```bash
vsce login kubeshop # You need PAT to login successfully.
```

And then either use `publish` directly:

```bash
vsce publish [version] # patch, minor, major, A.B.C
```

Or `package` + `publish` (this allows to test packaged extension before publishing)

```bash
vsce package [version] # patch, minor, major, A.B.C
vsce publish -i monokle-[version].vsix
```
