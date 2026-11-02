# Hosted OAuth test review

## Findings

1. Code simplification: reuse the small TwitchCon service and store. The test needs no new OAuth framework. Site source lives in its own Sites repository; Stream Machine plugin code is unchanged.
2. Documentation: distinguish deployed Site, Sites sign-in, Twitch consent, persisted connection, and mobile-device verification. The guide marks live consent and persistence pending. A disconnect transport error now reports an unknown outcome rather than claiming the connection survived.
3. Statechart: the [checked model](../statechart/122-hosted-oauth/report.md) covers owner-bound state, callback rejection, refresh, disconnect, and browser identity. TLC exited 0 with 18 states, 28 steps, five invariants, and no deadlock.

Security review checked the Site routes, service, store, and browser component. Owner identity comes from Sites. Connect and disconnect require same-origin POST. The callback uses a secure state cookie and an owner-bound state record consumed once. Tokens use AES-GCM with owner identity as associated data. Browser responses expose public account status only.

## Verification

The Site's TypeScript check, Sites build, and hook checks exited 0. Twenty-one OAuth tests passed. Tests use a SQLite facade for D1 SQL; they do not prove hosted token persistence.

The supported Sites source helper pushed commit `87dfe2726b8338bf1ba2afe6e020dbaeb818ee2b`. Private deployment `appgdep_6ae806a7de208191b918a02ab832e12f` succeeded with environment revision 2. The live D1 schema and browser consent are checked separately.

Live unauthenticated status, POST connect, and callback returned 401. Forged Sites identity headers on status also returned 401. No provider grant or token was created by these probes.

The user confirmed the new callback is registered on the existing Stream Machine Twitch app. Real browser consent and reload persistence remain pending. The in-app browser reached an OpenAI security-verification page after Sites sign-in navigation; this does not establish login success.

Primary checkout contained an unrelated untracked `src/ui/twitch_login.png`; it was preserved. Existing demo worker and host MCP processes were left running. The only task-owned preview is the standalone Site dev server on port 5173, to stop at handoff.

## Approval failure investigation

The user reported a failed connection after Twitch consent. Hosted request metadata confirmed that Twitch returned an authorization code to the callback, which redirected with a generic failure. The domain-age notice on Twitch was not evidence of rejection.

A failing regression reproduced rejection of an otherwise valid user-token validation response with `scopes: null`. The validator now treats null as an empty list. It still rejects malformed scope values, a foreign client, a missing user, and expired tokens. This is a confirmed parser defect; its role in the live failure requires a fresh consent test.

Callback errors now use an allowlist of safe reason codes in the redirect and server log. Unknown errors stay generic. Tests verify that raw messages and credential-like values are excluded. The combined Site suite passed 24 tests; TypeScript and Sites build exited 0. Source commit `785c2f8075e45f9b64bd682706e2eb748e83599a` contains the fix. The state model needs no change because the fix preserves its validation and failure transitions.

The user confirmed the retry displayed a connected account. Browser inspection verified `Connected as KLabFM @klabfm`. A full reload then displayed the same account after its status check. Screenshot `docs/hosted-oauth-connected.jpg` records the final state and contains no credential or unrelated personal data. This verifies real hosted authorization and saved-connection read-back after the parser fix. Disconnect and phone verification remain untested; the connection remains active. No plugin integration occurred.
