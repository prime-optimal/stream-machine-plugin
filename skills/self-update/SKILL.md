---
name: self-update
description: Update the Stream Machine Desktop package through the local plugin marketplace on the desktop host.
---

# Update Stream Machine Desktop

The Stream Machine Site plugin updates through Sites. This skill covers only the Stream Machine Desktop package. The update tools `stream_machine_update_check` and `stream_machine_update_prepare` are commented out in `src/server.ts` (#159), so the server does not expose them.

Install and update the package through a local plugin marketplace on the desktop host, as [the setup guide](../../docs/setup.md#install-on-desktop) describes. Do not upload it to the user's account. An account upload makes the package appear on web and mobile, where the stdio server cannot start. Preserve the single `stream-machine-desktop` entry in `mcp.json`.

To update, download the new `stream-machine-<version>.zip` from the repository's Releases page, unpack it over the marketplace's `plugins/stream-machine` folder, and reinstall with `codex plugin add stream-machine@stream-machine-desktop-local`. Then start a new conversation. The desktop tool list shows the `stream-machine-desktop` server with 7 tools.
