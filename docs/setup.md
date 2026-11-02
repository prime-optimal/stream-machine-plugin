# Build and install the package

Use this guide to build, check, and install the package. For the live OBS and Stream Deck demos, use the [live demo guide](demos/integration.md). You need mise and Bun 1.4.4 on `PATH`. Development tasks that call providers also need fnox; see [secret setup](secrets.md).

## Prepare the checkout

Run these commands from the repository root:

```sh
mise trust
mise run install
```

## Check the project

Run the type check, domain tests, and MCP smoke test:

```sh
mise run check
mise run test
mise run smoke
```

The smoke test starts the bundled server and checks that it lists the 7 OBS and Stream Deck tools and no broadcast-control tools.

## Build a plugin archive

Ensure that `tar`, `zip`, and `unzip` are on `PATH`. Run the package task:

```sh
mise run package
```

The task builds and validates both `docs/packages/stream-machine-0.3.0.zip` and `docs/packages/stream-machine-0.3.0.tar.gz`. Names follow the committed version in `plugin.json`. Both archives contain the same `stream-machine/` root. Git ignores these generated files. No provider credentials are needed for this build.

To install the archive, follow [Install on desktop](#install-on-desktop). For requirements and package contents, see the [package reference](package-reference.md).

## Install on desktop

Stream Machine Desktop registers two MCP servers: the hosted `stream-machine` server for Twitch, clips, and the Stream Machine menu, and the local `stream-machine-desktop` server for OBS and Stream Deck. Install it through a local plugin marketplace on the desktop host. Do not upload it to your account. An account upload makes the package appear on web and mobile, where the stdio server cannot start. If you uploaded an earlier version of the package, open Plugins, then Created by you, and remove it first.

For web and mobile, install the Stream Machine Site plugin instead. If you install both the Site plugin and this package on desktop, the Twitch tool names duplicate. Keep Twitch on the bundled `stream-machine` server and never replay a mutation through another provider.

1. Put Bun on `PATH`.
2. Create the marketplace folder and unpack the package into it:

   ```sh
   mkdir -p ~/stream-machine-marketplace/.agents/plugins ~/stream-machine-marketplace/plugins
   unzip docs/packages/stream-machine-<version>.zip -d ~/stream-machine-marketplace/plugins
   ```

3. Create `~/stream-machine-marketplace/.agents/plugins/marketplace.json`:

   ```json
   {
     "name": "stream-machine-desktop-local",
     "interface": { "displayName": "Stream Machine Desktop" },
     "plugins": [
       {
         "name": "stream-machine",
         "source": { "source": "local", "path": "./plugins/stream-machine" },
         "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
         "category": "Other"
       }
     ]
   }
   ```

4. Add the marketplace and install the plugin:

   ```sh
   codex plugin marketplace add ~/stream-machine-marketplace
   codex plugin add stream-machine@stream-machine-desktop-local
   ```

5. Start a new conversation in the Codex desktop app.

Expected result: `codex plugin list` shows `stream-machine` from `stream-machine-desktop-local`. In the desktop app, the tool list shows the hosted `stream-machine` server with its Twitch tools and the `stream-machine-desktop` server with 7 tools: three OBS tools and four Stream Deck tools. The first use of a hosted tool asks you to sign in through Sites and connect Twitch. Web and mobile conversations do not show this package.

To update, unpack the new archive over `~/stream-machine-marketplace/plugins/stream-machine`, then run `codex plugin marketplace list` to confirm the root and reinstall with `codex plugin add stream-machine@stream-machine-desktop-local`. To remove the plugin, run `codex plugin remove stream-machine`.

## Download a released package

Open [Releases](https://github.com/prime-optimal/stream-machine-plugin/releases) and select the version. Download `stream-machine-<version>.zip` from its assets. Repository access and GitHub sign-in are required. Release packages do not expire.

## Download a CI package

Open [Build plugin packages](https://github.com/prime-optimal/stream-machine-plugin/actions/workflows/package.yml) and select a successful run for the intended commit. Download its `stream-machine-<version>-<full-commit-SHA>` artifact. Repository access and GitHub sign-in are required.

Extract the downloaded Actions wrapper ZIP once. The files inside are the actual plugin ZIP and tar.gz. Use the inner `stream-machine-<version>.zip` for the desktop update, not the wrapper. Artifacts expire after 30 days.

To rebuild manually, select **Run workflow** and choose the intended branch. The workflow checks out that dispatch event's exact commit. For a local rebuild, check out the desired commit in a separate worktree, then run `mise run install` and `mise run package`.

Package checks do not verify a desktop update. Native-host installation is a separate manual check.

## Choose optional providers

Read the [integration inventory](integrations.md) before you enable a provider. Use each provider's supported installation and connection flow. Never paste credentials into chat.
