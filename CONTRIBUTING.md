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
xvfb-run -a npm run test
```

For manual testing you can test in development mode by running `Watch and Run Extension` task. You can also pack and install the extension by running:

```bash
vsce package
```

And then using _Install from VSIX_ option in VSC.

## Releasing

Releasing requires [`@vscode/vsce`](https://www.npmjs.com/package/@vscode/vsce) package installed.

**IMPORTANT**: To keep telemetry working, before running any `vsce` command, please update `SEGMENT_API_KEY` to correct value for a time of builidng the extension (DO NOT COMMIT THOUGH!).

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