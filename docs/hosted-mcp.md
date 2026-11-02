# Use hosted Twitch tools

Open the [Stream Machine Site](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site), sign in with ChatGPT, and connect Twitch. Stream Machine uses the same encrypted connection for the Site and its hosted MCP tools. Existing consent remains valid; reconnect only when status reports missing permissions.

## Connect the plugin

Use the canonical plugin provisioned by Sites when this Site is published with its `mcp` capability. Sites supplies its remote MCP URL and OAuth resource through `get_site(include_mcp_connection: true)`. Installing the old local package does not establish a hosted connection.

The default portable configuration is `mcp.json`. Hosts authenticate to the returned endpoint through the Sites connection. Do not paste a Twitch token, shared service token, or user ID into configuration. A service token does not identify a user.

Call `stream_machine_twitch_preflight`, then `stream_machine_twitch_status`. Confirm the returned account before reading its channel or creating a title preview. The Site's **Read my channel** button uses an authenticated browser route that invokes the same MCP handler and channel tool without changing Twitch. The remote `/mcp` endpoint requires a bearer-authenticated host connection; browser cookies alone do not authorize it.

## Approve a title

1. Call `stream_machine_twitch_preview_title` with the exact title.
2. Open its approval URL and review the account, current title, and proposed title.
3. Choose **Approve exact title**.
4. Return to the same hosted connection and call `stream_machine_twitch_apply_title` with that preview ID.

Approval alone does not update Twitch. Previews expire after five minutes. Disconnecting or replacing the connection invalidates pending previews. A changed account, title, or category requires a new preview. A consumed preview cannot run again, including after an unknown write outcome.

## Use the desktop fallback

Use the bundled `mcp.local.json` in place of `mcp.json` when you explicitly choose the local runtime. Portable clients read `mcp.json`; clients using the compatibility overlay read `.mcp.json`. Replace the selected client's configuration with the local file's `mcpServers` value through that client's supported configuration flow. Do not configure both transports under the same server name simultaneously.

The local path retains fnox, the registered `http://localhost:4017/api/twitch/callback`, and its own saved Twitch account. Verify that account before continuing. If it differs from the hosted account, approve the account switch before creating a new preview. Local OBS, USB Stream Deck, audio files, and the independent worker require this desktop runtime.

Offer fallback only for an unreachable or unconfigured hosted service, or a server error, when a desktop runtime is available. A 401 requires hosted sign-in. Cancellation, denied consent, invalid state, and revoked access never start another authorization flow. Never replay a mutation through another provider.

## Update shared source

Sites maintains an independent source repository. Its retained checkout is ignored at `docs/hosted-oauth-site/`; the local plugin archive excludes it. Synchronize the explicit pure-module list after changing shared Twitch behavior:

```sh
mise exec -- bun scripts/sync-hosted-twitch.ts docs/hosted-oauth-site
```

Expected result: eight copied modules and `lib/stream-machine/source.json` with source hashes. No local browser launcher, SQLite runtime, USB, OBS, or filesystem writer is copied. Build and publish the Site separately through the Sites workflow. Keep its project ID and current audience.

## Authorization boundary

Sites authenticates remote MCP callers and forwards `oai-authenticated-user-id`. `/mcp` requires that Site-scoped ID before discovery or tool execution. User identity comes from the platform, not request arguments, query strings, email, or an MCP session. The Worker must remain behind Sites dispatch, which validates authentication and strips forged identity headers.

Every request constructs an owner-bound runtime. D1 queries bind that owner for connections, previews, approvals, and execution leases. Twitch validation and refresh happen before provider access. Tool responses contain public account data and safe errors, never tokens or ciphertext. Public Site access does not authorize anonymous tools or private data.

The [checked state model](statechart/130-hosted-mcp/report.md) explains isolation and replay rules. The [implementation review](reviews/130-hosted-mcp.md) records actual validation, deployment, and remaining host checks. Model checks and fixture tests do not prove a real mobile session or a live title write.
