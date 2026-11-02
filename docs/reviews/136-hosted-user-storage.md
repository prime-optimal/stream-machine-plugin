# Hosted user storage for clip downloads

Issue [#136](https://github.com/prime-optimal/stream-machine-plugin/issues/136) adds private user files to the existing [Stream Machine Site](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site). This report separates source behavior, runtime tests, and live verification.

## Ownership and storage contract

A signed-in Sites user owns a persistent random UUID folder. D1 stores the user-to-folder mapping. R2 stores clip bytes under `<folderUUID>/clips/<artifactUUID>.mp4`. Twitch reconnects do not change its owner or folder.

The hosted download factory binds the Sites owner and that owner's Twitch account provider at construction. Tool arguments contain only the clip ID. The Twitch client checks clip identity. The factory checks download scope and broadcaster ownership before storage.

The tested success contract returns `{mode,clip,format,artifact}`. The artifact contains `storage: "hosted"`, `id`, `url`, `bytes`, `sha256`, and `completedAt`. It exposes no filesystem path, object key, or folder ID. Fixture success does not establish production acquisition.

The file URL is a permanent authenticated locator. Every GET requires Sites sign-in and a matching artifact owner. Anonymous users receive 401. Foreign users and missing IDs receive the same 404 before R2 access. Responses use private no-store caching and attachment delivery.

The Site remains public. Its homepage grants no access to private files. Local stdio remains an explicit fallback with private filesystem storage. Hosted failures never silently save locally.

## Streaming and failure limits

The writer accepts exactly two HTTPS hosts: `production.assets.clips.twitchcdn.net` and `d1ndex63qxojbr.cloudfront.net`. It rejects other CloudFront hosts, suffix lookalikes, user information, custom ports, fragments, and redirects. It sends no Twitch credentials to the CDN. It requires a positive content length, capped at 512 MiB. A FixedLengthStream preserves R2's stream length while the transfer checks byte count and SHA-256.

The deadline is 120 seconds. Successful R2 upload and validated completion precede the D1 artifact insert. Upload, completion, or metadata failures trigger object cleanup. Failed cleanup can leave an inaccessible orphan because no artifact record permits reading it.

The deadline cannot cancel an in-flight D1 insert. A caller can receive a timeout while a valid private artifact finishes later. Retries, duplicate suppression, quotas, deletion, orphan reconciliation, and retention limits remain outside this change.

## Authoritative source

Storage implementation is committed in the independent [Site source repository](https://git.chatgpt-team.site/666e1336-c60a-4924-bd62-1205dddbd6f7/appgprj_6ae8040442d481918f55ca79cca3b9b2.git), commit `fe62739b69ef4c0156ed01480b9e2ceed2167236`. Issue [#130](https://github.com/prime-optimal/stream-machine-plugin/issues/130) integrated it with hosted MCP and the combined migration history. The redundant patch copy and session-only worktree inventory have been removed.

Version 5 deployed integrated source `45f286258326a5b9c27515c715b24d4df09357e5`. Version 6 deployed redirect fix `480fd12dd221c5745b883cbeb8ddc46b3bdac28f` in deployment `appgdep_6ae8234cf740819183a84feb51a94b2d`, with environment revision 2 and MCP enabled.

Version 8 deployed final source `c0c5f7c8d462530416a4cebf77af847f467a5c06` in deployment `appgdep_6ae82495e1008191bf1df0289bd36af6`, with environment revision 2 and MCP enabled. Version 7 temporarily logged only rejected origin fields to diagnose the next failure. That diagnostic logging was removed from version 8.

The fresh review checkout is `/private/tmp/stream-machine-site-review-141`. The older ignored checkout at `docs/hosted-oauth-site/` contains earlier staged work and was preserved. Never publish that older checkout over integrated source.

The shared client remains owned by `src/adapters/twitch/clips-client.ts`. The existing #130 `scripts/sync-hosted-twitch.ts` was inspected and run against the fresh Site. Because that script reads its own #130 checkout, the fixed #136 client was then copied into its mapped destination and its SHA-256 entry updated. All other synchronized modules remained identical to deployed source.

## Live review and correction

The [PR #141 review](https://github.com/prime-optimal/stream-machine-plugin/pull/141#issuecomment-6569933758) tested version 5 on November 1, 2026. Authenticated hosted preflight, status, channel, and profile worked. Clip lookup and download returned `TWITCH_UNAVAILABLE`. This review reproduced the lookup failure before changing source.

Both Helix and CDN fetches used `redirect: "error"`, which [Cloudflare Workers does not support](https://developers.cloudflare.com/workers/runtime-apis/request/). They now use `manual`. Existing non-OK handling rejects all Helix 300–399 responses as `TWITCH_UNAVAILABLE`. The writer preserves its explicit 300–399 guard and `CLIP_DOWNLOAD_REDIRECT_REJECTED` fault. No extra branch is needed.

On version 6, hosted MCP lookup of KLabFM clip `ClumsyZealousBibimbapAMPEnergyCherry-SefTK-jl03LGBlm7` returned live metadata for "CAR CAR". Download reached a further `CLIP_DOWNLOAD_URL_REJECTED` failure. Safe origin diagnostics on version 7 showed that Helix returned `d1ndex63qxojbr.cloudfront.net`. A new legacy-host test failed before adding that exact host. No wildcard allowance was added, and no signed URL query was logged.

On version 8, the authenticated Site-provisioned `codex_apps` tool downloaded that clip successfully. The result reported `mode: "live"`, `format: "landscape"`, `storage: "hosted"`, 23,172,694 bytes, and SHA-256 `2b7f8b7d5f4f87f802aa65fb265a9bc676926d534c8c063db3a7f35f2c5a755a`. Artifact ID: `f8e4c946-742a-4b67-b5f6-b167d6564d65`. This verifies production acquisition through authenticated hosted `/mcp`.

Anonymous and forged-identity GETs to the actual artifact URL returned 401. A Site bypass token alone also returned 401 and is not an authenticated owner session. The in-app browser showed a signed-in KLabFM session, but file navigation timed out after 20 seconds. Worker logs recorded a lost network connection for that attempt. A completed same-owner browser byte read and a second live user\'s denial remain unverified. The fixture tests establish owner reads and cross-user isolation.

## Regression evidence

Tests ran on November 1, 2026, using Bun 1.4.4.

| Command or check | Actual result |
| --- | --- |
| Site `mise exec -- bun test tests/clips/redirect-worker.test.mjs`, before fix | Exit 1. All three new tests failed with the reported Helix and CDN errors. |
| Same regression after final fix | Exit 0. Four tests passed using actual workerd outbound fetch to a loopback HTTP stub, including both approved CDN hosts. |
| Site `mise exec -- bun test tests` | Exit 0. 90 tests, 166 assertions. |
| Site `mise exec -- bun run check` | Exit 0. |
| Site supported `build-site.mjs` helper | Exit 0. Production Worker build completed. |
| Root `mise run check` | Exit 0. |
| Root `mise run test` | Exit 0. 247 tests, including the older independent Site checkout's tests. |
| Root `mise run smoke` | Exit 0. 34 tools passed bundled stdio smoke. |
| Root `mise run build` | Exit 0. |
| Site staged secret scan and commit hooks | Exit 0. |
| Root `mise run hooks:check` | Exit 0. |
| Independent final source review | No blocking findings. |

The new Site fixture rewrites destinations only in its injected adapter and forwards the production fetch options to workerd's real `fetch`. It proves successful Helix metadata, download URL lookup, and CDN bytes streamed into actual local R2 and D1. It checks redirect statuses 300, 301, 302, 303, 304, 307, 308, and 399, zero redirect-target requests, absent CDN credentials, and unchanged stored objects and metadata after rejection. Shared plugin tests reject every status from 300 through 399 for both Helix methods.

The existing storage fixture separately proves exact owner reads, foreign-user 404, and anonymous 401. These are synthetic identities and data, not live Sites sessions.

## Required review questions

1. Code simplicity: retain existing status guards and error vocabulary. The runtime changes are manual fetch modes and one exact legacy CDN host. Remove duplicate source distribution and stale integration instructions.
2. Documentation clarity: identify deployed source and the observed version 5 failure. Distinguish tested contracts, fixture results, live metadata and download success, and incomplete browser file verification.
3. Statechart: no update needed. The [checked storage model](../statechart/136-user-storage/README.md) already includes upload failure before publication. Fetch runtime compatibility changes no ownership rule or storage transition. Its historical six-invariant and deadlock check covered 172 states.

Issue #136 remains open and In Progress while required merges and live acceptance remain outstanding. See the [original storage code review](136-storage-code-review.md) for known cancellation and cleanup limits.
