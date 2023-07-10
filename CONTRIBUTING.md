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

## Releasing

Releasing requires [`@vscode/vsce`](https://www.npmjs.com/package/@vscode/vsce) package installed.

After that, you can run:

```bash
vsce login kubeshop
vsce package
vsce publish [options] [version]
```