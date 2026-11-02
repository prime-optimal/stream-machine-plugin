---
name: self-update
description: Update the Stream Machine Desktop package through the local plugin marketplace on the desktop host.
---

# Update Stream Machine Desktop

The hosted `stream-machine` server updates through Sites, so it needs no package update. This skill covers the package and its local OBS and Stream Deck servers. The update tools `stream_machine_update_check` and `stream_machine_update_prepare` are commented out in `src/server.ts` (#159), so the server does not expose them.

Install and update the package through a local plugin marketplace on the desktop host, as [the setup guide](../../docs/setup.md#install-on-desktop) describes. Do not upload it to the user's account. An account upload makes the package appear on web and mobile, where the stdio servers cannot start. Preserve all three `mcp.json` entries.

To update, download the new `stream-machine-<version>.zip` from the repository's Releases page, unpack it over the marketplace's `plugins/stream-machine` folder, and reinstall with `codex plugin add stream-machine@stream-machine-desktop-local`. Then start a new conversation. The desktop tool list shows hosted Twitch tools, seven OBS tools, and four Stream Deck tools on their respective servers.
