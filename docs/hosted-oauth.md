# Test hosted Twitch OAuth

Open the [hosted OAuth test](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site) in a browser or on a phone. Sign in with ChatGPT, then choose **Connect Twitch** and complete Twitch consent.

The test uses the existing Stream Machine Twitch app. The user confirmed registration of this callback:

`https://stream-machine-oauth-test.tinycocoa22.chatgpt.site/api/twitch/callback`

The page requests account identity with no optional Twitch scopes. After connection, reload the page and confirm the same account remains visible. Choose **Disconnect**, reload, and confirm the connection is gone. Reconnect if desired.

Sites sign-in is separate from Twitch consent. Each browser needs its own Sites session. A successful desktop test does not prove a phone test.

## Published source

The private test Site is `appgprj_6ae8040442d481918f55ca79cca3b9b2`. Sites published source commit `87dfe2726b8338bf1ba2afe6e020dbaeb818ee2b` as version `appgprj_6ae8040442d481918f55ca79cca3b9b2~appgver_7d2f7b289d2c81918ed52b90915af19a`.

Deployment `appgdep_6ae806a7de208191b918a02ab832e12f` succeeded with runtime environment revision 2. Sites maintains this source in its own repository. The retained local checkout is `docs/hosted-oauth-site/`; Git ignores that independent checkout in this repository.

The test reuses TwitchCon's server-side OAuth service and encrypted D1 storage. Server configuration uses `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REDIRECT_URI`, and `TWITCH_TOKEN_ENCRYPTION_KEY`. Values remain outside source. The test has its own D1 database.

## Verified and pending

TypeScript, Sites build, and Site hook checks passed. Twenty-one OAuth tests passed against SQLite fixtures using the actual SQL. The [state model](statechart/122-hosted-oauth/report.md) passed five invariants and its deadlock check.

Live anonymous status, connect, and callback requests returned 401. A status request with forged Sites user headers also returned 401. This verifies the private access boundary for those requests.

Real Twitch consent, persisted account status, disconnect, reconnect, and a phone test remain pending user verification. The in-app browser reached Sites sign-in, then OpenAI security verification.

No plugin code, plugin manifest, installed account, or existing Stream Makeover Site was changed. A future web or mobile plugin also needs a hosted MCP server and its own authorization contract. This test does not implement that integration.

## Retry after an approval failure

The first live attempt reached the callback but did not save a connection. A regression test found that token validation rejected `scopes: null` for a token without optional permissions. The parser now normalizes null to an empty list while retaining identity and expiry checks.

Sites deployed fix commit `785c2f8075e45f9b64bd682706e2eb748e83599a` in deployment `appgdep_6ae80819c8e48191ad3290ef7426cb04`. Deployment succeeded with environment revision 2. The combined suite now passes 24 tests. Refresh the page and start a new Twitch connection; an old authorization code cannot be reused. Live success remains pending this retry.
