# Use hosted Twitch tools

Open the [Stream Machine Site](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site), sign in with ChatGPT, and connect Twitch. Stream Machine uses the same encrypted connection for the Site and its hosted MCP tools. Existing consent remains valid; reconnect only when status reports missing permissions.

## Connect the plugin

Use the canonical plugin provisioned by Sites when this Site is published with its `mcp` capability. Sites supplies its remote MCP URL and OAuth resource through `get_site(include_mcp_connection: true)`. Installing the old local package does not establish a hosted connection.

The portable configuration is `mcp.json`. It registers the hosted `stream-machine` server and the desktop `stream-machine-local` server. Hosts authenticate to the hosted endpoint through the Sites connection. Do not paste a Twitch token, shared service token, or user ID into configuration. A service token does not identify a user.

Call `stream_machine_twitch_preflight`, then `stream_machine_twitch_status`. Confirm the returned account before reading its channel or creating a title preview. The Site's **Read my channel** button uses an authenticated browser route that invokes the same MCP handler and channel tool without changing Twitch. The remote `/mcp` endpoint requires a bearer-authenticated host connection; browser cookies alone do not authorize it.

## Open the menu

After `stream_machine_twitch_status` verifies the account, call the hosted `stream_machine_open`. It returns `{ runtime: "hosted", siteOrigin }` and opens the Stream Machine menu on the hosted server. The menu shows Home, Clips, Connections, and Tools. Connections reads hosted Twitch status and opens the Site through the host. The menu has no OBS, Stream Deck, creative, or worker controls.

For those controls, call the local `stream_machine_workspace` on a desktop host. An MCP app can call only the server that served it, so the hosted menu and the desktop workspace stay separate. Both servers serve the same `ui://stream-machine/workspace-v4.html` bundle, and the bundle shows sections for the `runtime` that `stream_machine_open` reports.

## Read the home screen

Hosted Home reads Twitch on its own once connected. It calls `stream_machine_twitch_status`. When that reports an account, Home shows "Connected to Twitch as <name>" and calls `stream_machine_twitch_snapshot`. The snapshot is a read-only tool that makes at most five Helix requests: the account, channel, clips, last archive, and follower total. Home shows the profile image, offline image, title and category, follower total, last stream, clip count (`20+` when more exist), and up to six recent clip thumbnails. A section Twitch could not return appears as a quiet note. A failed snapshot keeps the confirmation and shows a **Retry** button.

Home caches the last snapshot in `localStorage` under `stream-machine:home:v1`. It paints the cache first, then replaces it with the fresh result. It drops the cache when status reports a different account or no connection. The cache holds only the public snapshot fields, never a token. A status request that fails for a transient reason keeps the cache.

Under the snapshot, **See what Stream Machine can do** lists suggestion cards. **Try** sends the card's prompt into the chat with `ui/message`. It is enabled only when the host advertises message support and is disabled in the standalone preview. OBS and Stream Deck cards are labeled **Desktop only**.

## Approve a title

1. Call `stream_machine_twitch_preview_title` with the exact title.
2. Open its approval URL and review the account, current title, and proposed title.
3. Choose **Approve exact title**.
4. Return to the same hosted connection and call `stream_machine_twitch_apply_title` with that preview ID.

Approval alone does not update Twitch. Previews expire after five minutes. Disconnecting or replacing the connection invalidates pending previews. A changed account, title, or category requires a new preview. A consumed preview cannot run again, including after an unknown write outcome.

## Use the desktop fallback

On a desktop host, `stream-machine-local` runs beside the hosted server and provides OBS, USB Stream Deck, creative, transcription, and worker tools. It also exposes Twitch tools with the same names as the hosted ones. Call those local Twitch tools only after the user explicitly chooses the fallback. No configuration change is needed to switch.

The local path retains fnox, the registered `http://localhost:4017/api/twitch/callback`, and its own saved Twitch account. Verify that account before continuing. If it differs from the hosted account, approve the account switch before creating a new preview. Local OBS, USB Stream Deck, audio files, and the independent worker require this desktop runtime.

Offer fallback only for an unreachable or unconfigured hosted service, or a server error, when a desktop runtime is available. A 401 requires hosted sign-in. Cancellation, denied consent, invalid state, and revoked access never start another authorization flow. Never replay a mutation through another provider.

## Update shared source

Sites maintains an independent source repository. Its retained checkout is ignored at `docs/hosted-oauth-site/`; the local plugin archive excludes it. Synchronize the explicit pure-module list after changing shared Twitch behavior:

```sh
mise exec -- bun scripts/sync-hosted-twitch.ts docs/hosted-oauth-site
```

Expected result: nine copied modules, including `clip-library.ts`, and `lib/stream-machine/source.json` with source hashes. No local browser launcher, SQLite runtime, USB, OBS, or filesystem writer is copied. Build and publish the Site separately through the Sites workflow. Keep its project ID and current audience.

## Authorization boundary

Sites authenticates remote MCP callers and forwards `oai-authenticated-user-id`. `/mcp` requires that Site-scoped ID before discovery or tool execution. User identity comes from the platform, not request arguments, query strings, email, or an MCP session. The Worker must remain behind Sites dispatch, which validates authentication and strips forged identity headers.

Every request constructs an owner-bound runtime. D1 queries bind that owner for connections, previews, approvals, and execution leases. Twitch validation and refresh happen before provider access. Tool responses contain public account data and safe errors, never tokens or ciphertext. Public Site access does not authorize anonymous tools or private data.

The [checked state model](statechart/130-hosted-mcp/report.md) explains isolation and replay rules. The [implementation review](reviews/130-hosted-mcp.md) records actual validation, deployment, and remaining host checks. Model checks and fixture tests do not prove a real mobile session or a live title write.
