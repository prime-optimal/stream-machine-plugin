# Hosted MCP UI investigation

Issue: <https://github.com/prime-optimal/stream-machine-plugin/issues/188>

## Confirmed evidence

- Supplied call `exec-e32d655f-1889-484f-9940-f1db82def550` succeeded as a tool
  call. This does not verify UI rendering.
- Desktop log at 2026-11-02 15:30:10 UTC records `McpServerError: Invalid
  params`, with HTML byte length undefined, for that exact call.
- At 15:30:12 UTC, `mcpServer/resource/read` failed for server `codex_apps`, URI
  `ui://stream-machine/workspace-v4.html`.
- Earlier 15:28:57–15:29:09 UTC widget fetches returned HTTP 404, `HTML asset
  not found`, for the same URI and connected Site.
- Source tool definition includes standard UI metadata. Resource handler accepts
  extra `_meta` fields and serves bundled HTML with MCP App MIME. Missing
  tool-result `_meta` is not proof of a defect.
- Installed Desktop 0.9.1 routes hosted Twitch tools to the correct Site. Plugin
  Eval 40/F contains cache-directory and static-budget findings; it does not
  establish rendering cause.

## Changes and checks

- Local repair branch: `codex/188-hosted-ui`.
- Opener now reports menu requested, with Site fallback URL, rather than
  claiming rendered success.
- Resource diagnostics log outcomes and sanitized validation codes/paths,
  without raw request data.
- Regression tests failed first, then passed. Full suite: 136 passed. Typecheck
  and production build passed before reconciliation.
- Concurrent Site v17 publication blocked the first push. No forced update
  occurred. User authorized takeover; v17 source commit
  `5485f3f332dac907454b241c4ee78bff630e98ee` was merged, preserving its
  rejection logging.
- Initial diagnostic build was subsequently deployed as version 18.

## Confirmed protocol defect and repair

Version 18 deployed diagnostic changes. At 15:43:20 UTC, Site logged the
workspace resource as served. Host then rejected its response at 15:43:28:
`PerRequestReadResourceResult.ttlMs` and `cacheScope` were missing.

The handler now adds `ttlMs: 0` and `cacheScope: private` to successful
discovery, tool-list, resource-list and resource-read results. Tool calls
remain unchanged. Regression failed before repair; 137 tests and typecheck
pass afterward.

## Deployment and actual host verification

Version 19 deployed successfully from commit
`dd69c199fa5f5989444027503cbcbb88ca95ced8`.
Deployment: `appgdep_6ae8b04e1ae881918d29e45cbc8684d6`.
Site: <https://stream-machine-oauth-test.tinycocoa22.chatgpt.site>

Actual MCP App rendered Home, Clips, Connections and Tools. Connections
Recheck returned KLabFM and all 12 required permissions at 15:47:39 UTC.
This verifies HTML delivery, bridge initialization and an app-initiated
read-only Twitch call.

Remaining limitation: Home snapshot reports a trusted-tool-scope error for
`stream_machine_twitch_snapshot`. Current chat's exposed tools omit that
new tool, while deployed source advertises it with model/app visibility.
Verify snapshot in a fresh chat with refreshed tool discovery. Do not weaken
host trust restrictions to work around stale discovery.

Protocol source: <https://py.sdk.modelcontextprotocol.io/client/caching/>

- <https://developers.openai.com/plugins/reference>
- <https://developers.openai.com/plugins/deploy/troubleshooting>
- <https://developers.cloudflare.com/workers/runtime-apis/console/>

Tool-to-template metadata belongs on the tool descriptor. Resource delivery must
succeed before browser UI code can execute.
