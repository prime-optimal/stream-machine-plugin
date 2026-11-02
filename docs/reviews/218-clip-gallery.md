# Clip gallery implementation review

Issue [#218](https://github.com/prime-optimal/stream-machine-plugin/issues/218).
Plugin baseline: 4eadf6e, rebased onto 28514c2. Site baseline: dd69c199.
The [implementation plan](../plans/2026-11-02-218-clip-gallery.md) describes the final flow.

## Findings resolved

| Finding | Resolution |
| --- | --- |
| PR #211 exposes Save to play but does not complete playback. | Play prepares an unsaved clip, then starts its returned Site media URL. |
| Saved metadata is discarded and ten-page rescans can miss older clips. | Archive results include authoritative stored metadata for both new and skipped saves. The client consumes it directly. |
| Late saves can replace another selected detail. | Detail revisions and disposed preparation controllers suppress stale updates. |
| Late status responses can reset a newly verified account. | A latest-status controller invalidates older reads on reconnect, runtime change, and teardown. |
| Autoplay rejection is silent. | Native controls remain available with an explicit Play fallback. |
| Gallery has no bounded bulk preparation. | Discovery and serial preparation expose counts, confirmation, cancellation, and per-clip failures. |
| Hosted UI is a separate generated artifact. | Sync the exact plugin build into the Site before source packaging. |
| Browser access cannot rely on unsigned owner cookies. | New gallery endpoints require the trusted Sites principal and exact same-origin writes. |

## Player choice

Native video already plays the real Site MP4, so this change retains it.
[Video.js 10](https://videojs.org/blog/videojs-10) is a suitable future choice for a shared skinned player.
[MediaBunny](https://mediabunny.dev/guide/media-sinks) is useful for media processing and decoded-frame workflows.
Neither library fixes discarded storage results, account races, or failed authorization.
No player dependency was added.

## Review questions

1. Simplification: reuse the existing archive, storage, library, media endpoint, and native video. A small shared preparation controller replaces page rescans and duplicate writes.
2. Documentation: distinguish the real Site media check from synthetic save responses. Preserve unknown write outcomes and account boundaries in user-visible messages.
3. Statechart: updated the existing playback model and added bounded preparation. The [model report](../statechart/primary-navigation/clips/library/README.md) records counts, checks, and exclusions.
4. Completion: this issue stays open while the required code PR awaits merge. Publish live and local evidence separately.

## Verification before publication

| Check | Result |
| --- | --- |
| Plugin TypeScript | Passed |
| Plugin domain tests | 303 passed, 2 skipped, 0 failed after rebase |
| Plugin build | Passed |
| Plugin stdio smoke | OBS 3 tools and desktop 4 tools passed |
| Existing UI audit | Fails with MCP -32601 against the desktop server; not evidence about hosted UI |
| Site full tests | 147 passed, 0 failed |
| Site TypeScript and production build | Passed |
| Model checks | Playback 47 states; bounded preparation 10,194 states; all configured checks passed |
| Local unified Play | Synthetic archive response, real Site media; time advanced to 6.97 seconds, duration 30, readyState 4, 1280 by 720 |
| Local seek and teardown | Native scrubber sought to 14.99 seconds; Back removed the video |
| Bulk fixture | Four per-clip failures displayed; no silent retry |
| Browser console | No errors during unified playback check |

Site browser sign-in is blocked at OpenAI verification in the current in-app browser session.
The native Codex app is unavailable to computer use, and no MCP App tab was exposed in this chat.
These are host-verification limits, not permission to weaken authentication.
Version 20 is published from Site source 0795a194f3dde7c7aae96bca007d90f5b7f26227. The final [live verification](../verification/218/verification.md) records 12 saved clips and playback checks for every Site URL. Native MCP-host rendering and the authenticated production gallery session remain unverified.

## Source provenance

Site source lives in a separate authenticated source repository at /Users/prime/Documents/ChatGPT/stream-machine-clips-site-218.
Its audience remains public, while account tools require owner identity.
The generic media route and existing public-clip policy are unchanged.
The source helper owns source push and publication packaging after explicit staging and review.
