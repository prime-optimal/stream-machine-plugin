# Run the demo and build the package

Use this guide for the separate mock demo or package build. For real devices, Twitch, HTML authoring, and the independent worker, use the [live demo guide](demos/integration.md). You need mise, Bun 1.4.4, and fnox on `PATH`. The private credential references resolve through 1Password.

## Prepare the checkout

Run these commands from the repository root:

```sh
mise trust
mise run install
```

## Preview a channel update

1. Start the local preview server:

	```sh
	mise run preview
	```

2. Open the [local demo](http://127.0.0.1:4318/?preview=1).
3. Expand **Mock preview** for the fictional demo.
4. Click **Use demo Twitch account**.
5. Select **Prepare channel details**.
6. Enter a stream title.
7. Choose a category.
8. Click **Preview channel update**.

The preview shows the current and proposed values for the fictional account. No change reaches Twitch.

To disconnect the demo account, click **Reset**. To stop the preview server, press Ctrl+C in its terminal.

## Check the project

Run the type check, domain tests, and MCP smoke test:

```sh
mise run check
mise run test
mise run smoke
```

The smoke test starts the bundled server and checks its tools, demo connection, preview, UI resource, and reset behavior.

## Build a plugin archive

Ensure that `tar`, `zip`, and `unzip` are on `PATH`. Run the package task:

```sh
mise run package
```

The task builds and validates both `docs/packages/stream-machine-0.3.0.zip` and `docs/packages/stream-machine-0.3.0.tar.gz`. Names follow the committed version in `plugin.json`. Both archives contain the same `stream-machine/` root. Git ignores these generated files. No provider credentials are needed for this build.

To install the archive, use your host's supported plugin installation flow. For requirements and package contents, see the [package reference](package-reference.md).

## Download a CI package

Open [Build plugin packages](https://github.com/prime-optimal/stream-machine-plugin/actions/workflows/package.yml) and select a successful run for the intended commit. Download its `stream-machine-<version>-<full-commit-SHA>` artifact. Repository access and GitHub sign-in are required.

Extract the downloaded Actions wrapper ZIP once. The files inside are the actual plugin ZIP and tar.gz. Use the inner `stream-machine-<version>.zip` for the desktop update, not the wrapper. Artifacts expire after 30 days.

To rebuild manually, select **Run workflow** and choose the intended branch. The workflow checks out that dispatch event's exact commit. For a local rebuild, check out the desired commit in a separate worktree, then run `mise run install` and `mise run package`.

Package checks do not verify a desktop update. Native-host installation is a separate manual check.

## Transcribe a local recording

Follow [Transcribe one local audio file](demos/transcription.md) for the explicit OpenAI upload tool. `OPENAI_API_KEY` is optional for other workflows. Discovery and smoke checks do not upload audio.

## Choose optional providers

Read the [integration inventory](integrations.md) before you enable a provider. Use each provider's supported installation and connection flow. Never paste credentials into chat.
