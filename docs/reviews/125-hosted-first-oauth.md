# Review PR #125 for hosted-first OAuth

Review target: PR #125 at `d1304c5aae908754d1a23599f4cbe022f1ca6a84`. Plugin baseline: `02c44c5`. Follow-up: [issue #127](https://github.com/prime-optimal/stream-machine-plugin/issues/127).

## Verdict

PR #125 verifies a standalone hosted Sites test. It does not make hosted OAuth the plugin default. Treat it as supporting evidence for integration, not completion of web or mobile support.

## Findings

### P1: The plugin still selects only local OAuth

`src/adapters/twitch/register.ts:4-12` constructs `LocalTwitchRuntime` for status, account reads, and title actions. Lines 27-31 also route preflight and connect through local code. The PR changes no plugin source or manifest. Its `docs/hosted-oauth.md:29` explicitly leaves hosted MCP and authorization integration for later work.

A hosted URL alone cannot fix this. Connect, status, profile, title actions, and clip tools need one authenticated provider selection. Hosted success must be visible to the same caller's later tool requests.

### P1: Local preflight and URL validation block hosted connections

`src/ui/connections.ts:67-78` requires local preflight and a desktop browser-launch result before accepting a connection. `connectionUrl` at lines 23-27 accepts only `http://localhost:4017/connect`. `src/auth/local-runtime.ts:26-30` requires local credentials and an available callback port.

The default connection must begin with hosted availability and authentication. Open an approved HTTPS authorization URL through the host's supported navigation. Apply an exact configured-origin allowlist. Run desktop preflight only after selecting local fallback. A hosted response must not require `browserRequested` from an operating-system browser launcher.

### P1: Hosted browser identity does not establish plugin identity

The PR's `docs/statechart/122-hosted-oauth/report.md:23` binds connection records to Sites `user.userId`. Its `docs/hosted-oauth.md:11` requires a Sites session in each browser. The local runtime uses `local-desktop-owner` at `src/auth/local-runtime.ts:13`.

Define authenticated hosted MCP access and bind each caller to its hosted Twitch record. Reject caller-supplied owner identifiers. Reuse encrypted server-side token storage, refresh, and revocation. Keep provider credentials and Twitch tokens out of UI and tool responses. Never turn the shared local owner constant into hosted multi-user identity.

### P2: Web and mobile acceptance remains unproved

The PR's `docs/hosted-oauth.md:27` records desktop consent and reload. Phone verification and disconnect remain untested in the PR body. Its test initially requests no optional scopes at guide line 9. Another session has staged scope-parity updates in the OAuth worktree; those changes are outside this reviewed head and must be reviewed separately.

Hosted OAuth also requires a remotely reachable plugin MCP service. Replacing the callback does not make a local stdio process available to web or mobile. Keep desktop-only OBS and Stream Deck capabilities distinct from hosted Twitch capabilities.

## Required selection behavior

Hosted is the default on every supported host. After a classified hosted transport or service failure, offer local OAuth only if a reachable desktop runtime is available. Web and mobile without that runtime retain a hosted retry path and an actionable error.

Cancellation, denied consent, invalid state, identity mismatch, and revoked access do not silently start another authorization flow. Reauthentication stays with the selected provider. Preserve the existing local account, but require a verified account before using it as fallback.

Select the provider for a connection attempt and its later operations. Ignore late callbacks from abandoned attempts. Invalidate pending title previews when the provider or account changes. Do not replay a mutation after a hosted failure because the remote action may already have succeeded.

## Verification required before claiming integration

- Reproduce local-only routing with a failing test before implementation.
- Test hosted success without local secrets, a callback listener, or an operating-system browser launcher.
- Test hosted failure with and without an available desktop fallback.
- Test denied consent, cancellation, identity isolation, reconnect, disconnect, expired attempts, and late callbacks.
- Verify that status and a read-only Twitch operation use the selected account after reload.
- Verify the actual plugin on desktop, web, and mobile. Standalone Sites verification is separate evidence.

## Review checks

1. Code simplicity: no code changes in this PR. Integration should reuse existing account-provider behavior and shared OAuth services. Avoid separate provider selection in every tool.
2. Documentation clarity: the guide correctly limits its claims to a standalone test. Retain that boundary until hosted plugin integration is verified. Review later scope-parity changes separately.
3. Statechart: the existing hosted model excludes plugin integration and network-failure progress at `docs/statechart/122-hosted-oauth/report.md:39`. Extend it during implementation for hosted selection, eligible local fallback, cancellation, and stale callbacks. Check caller isolation, one selected provider, and no mutation replay. No model was changed or checked during this review.
4. Issue completion: #122 remains open for its live verification. #127 tracks integration and stays open. No integration acceptance item is complete from this review.

## Review evidence

PR metadata and file list were read with `gh pr view 125`. Exact PR-head documents were inspected with `git show`; staged OAuth-worktree changes were excluded. Plugin source was inspected at baseline `02c44c5`. RepoPrompt CLI and MCP returned `workspace_authority_unavailable`; direct file reads were used after both failed. No OAuth requests, broadcasts, provider mutations, or runtime tests were performed.
