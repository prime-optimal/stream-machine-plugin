# Twitch OAuth and title demo

Issues #25, #26, #27. Local runtime reuses Stream Makeover OAuth instead of trusting fabricated Sites headers or extracting D1 tokens.

## Reused code

Copied from `prime-optimal/stream-makeover`, commit `4e2bff85969550e3b2e94aed2fab7a6b8f2f62db`, `studio/lib/twitch/`:

- `src/auth/upstream/client.ts` and `crypto.ts` unchanged.
- `service.ts` preserves state validation, owner binding, encrypted storage, validation, refresh lease, cancellation and revocation. Changes: extensionless imports, explicit broadcast-scope option, internal validated-token callback.
- `store.ts` retains only `Connection` and `ConnectionStore` contracts. `src/auth/local-store.ts` implements them with Bun SQLite. Tokens remain encrypted using existing AES-GCM code and fnox key.
- `tests/twitch-upstream.test.mjs` retains upstream service tests. Helper binds local store and adjusts two persistence assertions to local table names.

Single local desktop owner maps to OAuth account authorized in local browser. Existing Sites owner and connection stay separate. Reconnecting local runtime clears pending previews. No owner, broadcaster, credential, or endpoint selector enters tool inputs.

## Run

Add exact callback to existing Twitch application:

`http://localhost:4017/api/twitch/callback`

`fnox.toml` references paired client ID and client secret items titled `twitch stream machine` in Developer vault. Local token encryption uses a distinct new Developer item, `Stream Machine local Twitch token encryption`. Secret values remain in 1Password. Existing production callback stays registered. Local runtime uses fixed local callback without changing production secret configuration.

From this checkout:

```sh
fnox exec -- mise exec -- bun scripts/twitch-demo.ts
```

Open returned `connectUrl`, authorize creator account, return to terminal. Driver accepts one JSON command per line:

```json
{"action":"status"}
{"action":"channel"}
{"action":"preview","title":"Stream Machine demo"}
```

Preview returns exact before/after, broadcaster, expiry, and browser approval URL. Open approval URL, review title and account, click approval. Then submit apply command using returned preview ID. No model-supplied boolean can approve. Approval alone does not write; apply performs current account/scope/title/category rechecks, one PATCH, then read-back.

Store defaults to `~/.local/share/stream-machine/twitch.sqlite`, private directory 0700 and file 0600. Optional `STREAM_MACHINE_TWITCH_STORE` must use private directory. No tokens reach tool results or UI.

## MCP composition

Call `registerTwitchTools(server)` from `src/adapters/twitch/register.ts`. Runtime resolves lazily from secret environment. Missing configuration reports `TWITCH_NOT_CONFIGURED`, never mock data.

Tools: `stream_machine_twitch_connect`, `stream_machine_twitch_status`, `stream_machine_twitch_channel`, `stream_machine_twitch_preview_title`, `stream_machine_twitch_apply_title`.

Internal workers reuse `TwitchAccountProvider.withAccount(operation)` from `src/auth/twitch.ts`; credentials stay callback-local. `createLocalTwitchRuntime()` exposes provider for composition. No generic provider framework added.

## Verification

`mise run check` passed. `mise run test` passed 29 tests: original mock tests, 15 upstream OAuth service checks, channel and title safety checks, and real loopback HTTP callback/approval flow using explicitly fake Twitch responses.

Fake-provider tests prove target derivation, missing scope, changed identity, stale title/category, preview expiry, approval requirement, single-use execution, concurrent-write exclusion, read-back mismatch, ambiguous write outcome, redacted results, cookie/state rejection, browser Origin enforcement. They do not prove live Twitch authorization or title mutation.

Live creator verification on 2026-11-01: validated `KLabFM` (`klabfm`), broadcaster `1494553296`, scope `channel:manage:broadcast`. Real Helix read returned title `K-Lab Discovery - EDC Week Night 3`, category `Music` (`26936`). No live title write performed at this point.

Browser displayed callback error despite successful grant and storage. Historical error was not captured. Replaying a completed callback reproduced the same false failure in a failing test. Runtime now shares one completion per hashed, validated browser-cookie-bound state, preventing duplicate exchanges while preserving wrong-cookie and wrong-state rejection. Driver `diagnostics` command returns only sanitized error class, code, and status. Tests prove retry succeeds, exchange runs once, and wrong browser/state still fails. Historical browser error cause remains an inference.

Approval form initially inherited `Referrer-Policy: no-referrer`. For navigation POST, the [Fetch standard](https://fetch.spec.whatwg.org/#append-a-request-origin-header) serializes Origin as `null` under this policy, which conflicts with the same-origin approval guard. Approval GET now uses `same-origin`; OAuth pages retain `no-referrer`. Failing-first regression verifies this header boundary. Tests retain rejection for null Origin with valid cookie, wrong Origin, and missing cookie. Rejection diagnostics expose only origin-match, null-origin, and matching-cookie booleans.

## Limits

Local desktop access is trusted. Browser approval requires same-origin POST and HttpOnly SameSite cookie. Previews expire after five minutes and disappear on restart. Network failure after PATCH reports unknown outcome and consumes preview; no write retry. Read-back failure reports `applied_unverified`. Twitch offers no conditional title update, so another channel editor can race the preflight read.

Official API reference: [Get channel information](https://dev.twitch.tv/docs/api/reference/#get-channel-information), [Modify channel information](https://dev.twitch.tv/docs/api/reference/#modify-channel-information). Title writes require `channel:manage:broadcast` and token owner matching broadcaster. Reads use fixed Helix URL and account-derived target.
