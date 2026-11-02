# Review hosted-first OAuth integration for #127

This review lists what Stream Machine needs before hosted Twitch OAuth becomes the default and local OAuth becomes a fallback. Web and mobile users need the hosted path. OBS WebSocket control and Stream Deck updates stay on desktop.

Inputs: merged [PR #125](https://github.com/prime-optimal/stream-machine-plugin/pull/125), which verified a standalone hosted Sites test, and plugin source at `aa3fd74`. Tracking issue: [#127](https://github.com/prime-optimal/stream-machine-plugin/issues/127).

## Verdict

PR #125 proves that the hosted Sites test can connect a Twitch account with the twelve-scope baseline that local OAuth requests (`docs/hosted-oauth.md:9-28`). It does not change the plugin. Use it as evidence that hosted OAuth works, not as web or mobile plugin support.

## Findings

### P0: Web and mobile need a hosted plugin server

Tracked in [#130](https://github.com/prime-optimal/stream-machine-plugin/issues/130).

Today the plugin runs as a local stdio process (`src/stdio.ts`). Web and mobile hosts cannot start that process. A hosted OAuth callback alone gives those users no tools. `docs/hosted-oauth.md:52` already states that a web or mobile plugin needs a hosted MCP server and its own authorization contract.

Decide two things before implementation:

1. Which hosted service exposes the Twitch tools to web and mobile hosts.
2. How the host authenticates each MCP request to that service.

The Sites session is a browser cookie bound to `user.userId` (`docs/statechart/122-hosted-oauth/report.md:28`). MCP tool requests do not carry that cookie. The hosted server needs MCP authorization that maps each caller to one Sites user and that user's Twitch record.

### P1: The plugin selects only local OAuth

Tracked in [#132](https://github.com/prime-optimal/stream-machine-plugin/issues/132).

`src/adapters/twitch/register.ts:4-12` constructs `LocalTwitchRuntime` for status, account reads, and title actions. Lines 27-31 route preflight and connect through local code. Connect, status, profile, title, and clip tools need one provider selection. A hosted connection must be visible to the same caller's later tool requests.

### P1: Desktop has no path to hosted Twitch access

Tracked in [#133](https://github.com/prime-optimal/stream-machine-plugin/issues/133).

The local process has no credential for the hosted service, so hosted cannot be the desktop default yet. Choose one design:

- **Hosted proxy.** The local process holds a hosted access credential. The hosted service calls Twitch and keeps the Twitch tokens server-side.
- **Token copy.** The hosted service returns Twitch tokens to the local process.

Use the hosted proxy. Token copy puts Twitch tokens in tool or transport responses and creates two refresh owners for one grant. With the proxy, desktop status and title actions use the same hosted account as web and mobile.

### P1: Local preflight and URL validation block hosted connections

Tracked in [#134](https://github.com/prime-optimal/stream-machine-plugin/issues/134).

`src/ui/connections.ts:67-78` requires local preflight and a desktop browser launch before it accepts a connection. `connectionUrl` at lines 23-27 accepts only `http://localhost:4017/connect`. `src/auth/local-runtime.ts:26-30` requires local credentials and a free callback port.

Start the default connection with hosted availability and authentication. Open an approved HTTPS authorization URL through the host's supported navigation. Allow only exact configured origins. Run desktop preflight only after the plugin selects local fallback. A hosted connect response must not require `browserRequested`.

### P1: Title approval works only on localhost

Tracked in [#135](https://github.com/prime-optimal/stream-machine-plugin/issues/135).

`approvalUrl` at `src/auth/local-runtime.ts:153` returns `http://localhost:4017/approve?id=...`. Web and mobile users cannot open that page, so `stream_machine_twitch_preview_title` and `stream_machine_twitch_apply_title` fail there. Hosted mode needs a hosted approval page bound to the same caller, account, and preview.

### P1: Hosted identity does not establish plugin identity

Tracked in [#131](https://github.com/prime-optimal/stream-machine-plugin/issues/131).

The local runtime uses one owner, `local-desktop-owner` (`src/auth/local-runtime.ts:13`). Each hosted caller must map to its own hosted Twitch record. Reject caller-supplied owner identifiers. Reuse the hosted service's encrypted token storage, refresh, and revocation. Keep provider credentials and Twitch tokens out of UI and tool responses. Do not reuse the local owner constant for hosted users.

### P2: Hosted clip download needs Sites storage

Tracked in [#136](https://github.com/prime-optimal/stream-machine-plugin/issues/136).

`stream_machine_twitch_download_clip` writes a private local file (`src/adapters/twitch/clips-register.ts:12`). Web and mobile hosts have no local file system, but the hosted service can store the clip in ChatGPT Sites storage, as it stores OAuth connections. Bind each stored clip to its caller, and return a link that only that caller can open. Keep the local file path for local fallback.

### P2: OBS and Stream Deck stay on desktop

Tracked in [#137](https://github.com/prime-optimal/stream-machine-plugin/issues/137).

OBS WebSocket control and Stream Deck updates need a desktop runtime on the user's machine. Hosted callers without one must receive a clear unavailable error that names the missing desktop runtime.

### P2: Fallback can switch Twitch accounts

Tracked in [#138](https://github.com/prime-optimal/stream-machine-plugin/issues/138).

The local store and the hosted store can hold different Twitch accounts. Before local fallback runs an action, compare the local Twitch user ID with the hosted one. If the IDs differ, ask the user before switching accounts.

### P2: Plugin metadata still says desktop-only

Tracked in [#139](https://github.com/prime-optimal/stream-machine-plugin/issues/139).

`plugin.json` describes Stream Machine as a "Desktop prototype" that "Requires local provider tools". Update `longDescription` when hosted OAuth becomes the default. State that OBS WebSocket control and Stream Deck updates need desktop.

### P2: Web and mobile acceptance remains unproved

Tracked in [#140](https://github.com/prime-optimal/stream-machine-plugin/issues/140).

`docs/hosted-oauth.md:50` records desktop consent and reload. Disconnect and a phone test remain unverified. The hosted grant already matches the local scope baseline, so scope parity does not block integration.

## Required selection behavior

Hosted is the default on every supported host. After a classified hosted transport or service failure, offer local OAuth only when a reachable desktop runtime exists. Classified failures are an unreachable hosted service, a 5xx response, and an unconfigured hosted service. A 401 response means reauthentication with hosted, not fallback. Web and mobile without a desktop runtime keep a hosted retry path and an actionable error.

Cancellation, denied consent, invalid state, identity mismatch, and revoked access never start another authorization flow. Reauthentication uses the selected provider. Keep the existing local account, but verify it before using it as a fallback.

Select the provider once per connection attempt and use it for later operations. Ignore late callbacks from abandoned attempts. Invalidate pending title previews when the provider or account changes. Never replay a mutation after a hosted failure, because the remote action may already have succeeded.

## Verification required before claiming integration

- Reproduce local-only routing with a failing test before implementation.
- Test hosted success without local secrets, a callback listener, or an operating-system browser launcher.
- Test hosted failure with and without an available desktop fallback.
- Test denied consent, cancellation, identity isolation, reconnect, disconnect, expired attempts, and late callbacks.
- Test a fallback where the local and hosted Twitch accounts differ.
- Verify that status and a read-only Twitch operation use the selected account after reload.
- Verify title preview and approval through the hosted approval page.
- Verify hosted clip download to Sites storage, and confirm that another caller cannot open the stored clip.
- Verify that OBS and Stream Deck tools return the unavailable error on web and mobile.
- Verify the actual plugin on desktop, web, and mobile. Standalone Sites verification is separate evidence.

## Review checks

1. Code simplicity: this PR changes no code. Integration should select the provider in one place in `registerTwitchTools`, not in each tool. Reuse the hosted service's OAuth and token storage.
2. Documentation clarity: `docs/hosted-oauth.md` limits its claims to a standalone test. Keep that limit until hosted plugin integration is verified.
3. Statechart: the hosted model excludes plugin integration and progress under network failure (`docs/statechart/122-hosted-oauth/report.md:43`). Extend it during implementation for hosted selection, eligible local fallback, account mismatch, cancellation, and stale callbacks. Check caller isolation, one selected provider, and no mutation replay. This review changed and checked no model.
4. Issue completion: #122 stays open for disconnect and phone verification. #127 tracks integration and stays open. This review completes no integration acceptance item.

## Review evidence

Plugin source citations were read at `aa3fd74`, after PR #125 merged. Hosted guide and statechart citations refer to the merged documents. This review made no OAuth requests, broadcasts, provider mutations, or runtime tests.
