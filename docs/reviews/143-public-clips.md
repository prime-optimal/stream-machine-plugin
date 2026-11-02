# Public clip URL verification

[Issue #143](https://github.com/prime-optimal/stream-machine-plugin/issues/143) implements the user's revised access rule. Anyone holding a completed Twitch clip URL can view or download it. Existing URLs work without a migration.

## Published behavior

[View the verified clip](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site/api/user-data/files/d56e9e6d-17cb-40dd-a453-a4f485f28bb9). [Download the same clip](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site/api/user-data/files/d56e9e6d-17cb-40dd-a453-a4f485f28bb9?download=1).

GET returns inline MP4. Exactly `?download=1` selects attachment delivery. HEAD returns full representation headers without fetching the body. Single byte ranges support seeking. Valid ranges return 206, including suffix and open-ended ranges. Invalid or unsatisfiable ranges return 416. Requests with `If-Range` receive the full representation because this route does not implement validators.

Clip responses allow anonymous cross-origin reads with `Access-Control-Allow-Origin: *`. No credentials are required. Responses retain `private, no-store` caching, `no-referrer`, and `nosniff`. The word `private` in the cache header controls caches, not access.

Only completed artifact rows with `kind='clips'` and `media_type='video/mp4'` enter public delivery. The route checks R2 object presence and length. It does not expose object keys, owner IDs, or folder IDs. The R2 bucket remains private, with no folder or bucket listing route.

Non-clip data retains the existing owner-scoped GET fallback. Anonymous or foreign callers receive 404. Uploads, Twitch account operations, and MCP still require their existing authorization. Local filesystem fallback is unchanged.

A clip URL can be forwarded. Sign-out does not revoke it. Expiration, revocation, deletion, listing, and a plugin video-player component are outside this change.

## Source and deployment

The independent [Site source repository](https://git.chatgpt-team.site/666e1336-c60a-4924-bd62-1205dddbd6f7/appgprj_6ae8040442d481918f55ca79cca3b9b2.git) contains committed and pushed source `7a6d5d591b20192565c60aaca61ad2c5668fbabd`.

Sites version 9 deployed that source in `appgdep_6ae82a7ad38c8191a8f8f0f24de70f0e`. Publication succeeded with environment revision 2 and MCP enabled. The Site audience remains public.

Source anchors are relative to the independent Site checkout:

- `lib/clips/file-response.ts:26` checks public eligibility, streams R2 ranges, and sets inline or attachment headers.
- `lib/user-data/file-handler.ts:5` serves eligible clips before identity resolution and retains the private fallback.
- `app/api/user-data/files/[id]/route.ts:6` binds GET and HEAD to that handler.
- `lib/user-data/store.ts:49` adds the clip read entry point. Its existing write and owner-scoped read contracts remain.
- `tests/clips/public-file-worker.test.mjs` runs the shared handler in actual workerd with local D1 and R2.

The implementation uses Cloudflare's [R2 ranged-read API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/). It passes normalized offset and length to R2 rather than buffering or slicing full files.

## Actual checks

Checks ran on November 1, 2026, with Bun 1.4.4.

| Check | Result |
| --- | --- |
| Supplied URL before implementation, anonymous | 401. |
| Initial new Worker test before helper existed | Exit 1, unresolved helper import. |
| Site `mise exec -- bun test tests` | Exit 0. 112 tests, 289 assertions. |
| New public-file Worker suite | 21 tests passed with actual workerd, D1, and R2. |
| Site `mise exec -- bun run check` | Exit 0. |
| Supported Site production build helper | Exit 0. |
| Site staged secret scan and commit hooks | Exit 0. |
| State model and artifact-source recheck | Exit 0. Seven invariants and NoDeadlock, 288 states, 704 steps. |

The new tests cover anonymous and foreign-user clip reads, public access without resolving identity, inline and attachment headers, HEAD without a body read, range normalization, huge numeric range values, invalid ranges, historical clip records, wrong MIME, private non-clip records, unpublished and missing objects, inconsistent stored length, denied listing paths, and denied anonymous fixture uploads. Existing production OAuth, MCP identity, clip scope, and ownership tests still pass. Fixture upload denial is not a production authentication test by itself.

The first TypeScript check rejected BigInt literals because the Site targets an older ECMAScript version. BigInt constructor calls preserve the range algorithm without changing the target. Final TypeScript and build checks pass.

## Anonymous production verification

All HTTP checks below used no cookies, bearer token, Sites bypass token, or authenticated user header.

| Request | Actual result |
| --- | --- |
| HEAD supplied clip URL | 200, video/mp4, inline disposition, length 23,167,834, Accept-Ranges bytes. |
| Full GET | 200, 23,167,834 bytes. |
| GET with `Range: bytes=0-63` | 206, 64 bytes, Content-Range `bytes 0-63/23167834`; bytes match the full-response prefix. |
| HEAD with `?download=1` | 200, attachment disposition. |
| Unsatisfiable range | 416, Content-Range `bytes */23167834`. |
| File-list path, missing UUID, malformed ID | 404. |
| Anonymous POST `/mcp` | 401. |

The full response SHA-256 is `66e24055c824cd2b6b18fb5fd8a8a7b38dbd36a3f8037e7248dd1566005f6978`.

The in-app browser decoded and played the clip at 1280 by 720, duration 30.014 seconds, readyState 4, and no media error. The user also confirmed playback. The HTTP checks above independently establish anonymous access; browser cookies are not used as that evidence.

![Completed clip playback through the final URL](143-public-clip.jpg)

## Required review questions

1. Code simplicity: one clip response helper owns metadata and range behavior. One shared handler owns public-first dispatch and private fallback. The framework route stays thin. Review found no additional abstraction necessary.
2. Documentation clarity: this report explicitly supersedes the owner-only clip rule in #136 and PR #141. Earlier private-download evidence remains historical. Issue #136's acceptance criterion now links to #143.
3. Statechart: the access rule changed, so the [checked model](../statechart/143-public-clips/README.md) distinguishes public completed clips, private owner reads, unpublished objects, and denied listing paths. Its seven invariants and deadlock check pass. It does not prove UUID entropy, HTTP range behavior, browser decoding, or deployment.

No blocking source-review finding remains. Required plugin documentation/model changes await their PR merge, so issue #143 remains open and its Board item stays In Progress.
