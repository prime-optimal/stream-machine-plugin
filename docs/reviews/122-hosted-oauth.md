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

## Scope parity review

The [owner's PR comment](https://github.com/prime-optimal/stream-machine-plugin/pull/125#issuecomment-6569024298) requests the local OAuth baseline of twelve scopes. This extends the same standalone test and stays in PR #125. The prior profile-only live result remains historical evidence, not proof of a broader grant.

The Site generates its permission snapshot from `src/auth/permissions.ts` in the Stream Machine source. A parity check verifies the snapshot and its source hash. Runtime code reads the packaged snapshot, so it does not depend on a sibling checkout. The request preserves prior grants and checks the complete requested list before saving.

Two failing regressions reproduced the missing baseline and acceptance of an incomplete replacement grant. Updated tests reject incomplete and denied replacement grants while retaining the previous connection. The consent page identifies the local implemented permissions, the future permissions, and the standalone Site's limited behavior. It also retains the Twitch-policy warning about unused scopes.

The existing zero-scope account needs a fresh Twitch authorization. Deploying this change does not expand its grant automatically. Live scope completeness remains pending until the user approves and the status response confirms it.

Bounded source review found no blocking defect. Regression coverage also checks a provider returning the same access token as the stored connection: a rejected replacement must not revoke that previous token. Distinct rejected replacement tokens are revoked. Twenty-eight Site tests pass, including request union, grant completeness, prior-connection preservation, and permission status. TypeScript and Sites build pass. Final staged-content hooks run before publication.

The updated model checked 60 states and 106 steps; eight invariants and the deadlock check passed. Snapshot generation and its parity check use the canonical source explicitly. A patch of the Site changes is retained with this review so PR reviewers can inspect source held in the separate Sites repository.

Sites published source `5b183b7a023ef69bb2cb14066ebfd0c01547ccda` in deployment `appgdep_6ae8120b2f0c819189e10ef233193c73`, which succeeded at environment revision 2. Staged secret checks passed before commit. The user was asked to approve the expanded consent. Browser automation could not reattach because its backend reported an unavailable browser API; native app access was denied. These limits do not invalidate the verified deployment, but no new browser screenshot or expanded grant is claimed yet.

The user then completed consent and reported **Missing baseline scopes: None**. A read-only live D1 check returned exactly the twelve requested baseline scopes in `scopes_json`. This confirms the expanded grant was validated and saved. Credential fields were omitted from the displayed result and reports. The browser limitation still prevents a new screenshot attachment; the previous screenshot remains historical profile-only evidence. No plugin or planned provider action was exercised.
