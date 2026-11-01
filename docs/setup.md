# Run the demo and build the package

Use this guide to preview a mock channel update or build a desktop plugin archive. You need mise and Bun 1.4.4 on `PATH`. You do not need Twitch credentials.

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

2. Open the [local demo](http://127.0.0.1:4317/?preview=1).
3. Click **Use demo Twitch account**.
4. Select **Prepare channel details**.
5. Enter a stream title.
6. Choose a category.
7. Click **Preview channel update**.

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

Run the package task:

```sh
mise run package
```

The task writes `docs/packages/stream-machine-0.1.0.tar.gz`. It prints the archive path and reports that it inspected the entries.

To install the archive, use your host's supported plugin installation flow. For requirements and package contents, see the [package reference](package-reference.md).

## Choose optional providers

Read the [integration inventory](integrations.md) before you enable a provider. Use each provider's supported installation and connection flow. Never paste credentials into chat.
