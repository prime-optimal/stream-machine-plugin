# Combined media integration review

This reference records integration evidence, not live acceptance for blocked providers.

## Scope and review questions

The [plan and coverage ledger](../plans/18-clips-and-games.md) records exact heads for [PR #76](https://github.com/prime-optimal/stream-machine-plugin/pull/76), [PR #77](https://github.com/prime-optimal/stream-machine-plugin/pull/77), [PR #79](https://github.com/prime-optimal/stream-machine-plugin/pull/79), and [PR #78](https://github.com/prime-optimal/stream-machine-plugin/pull/78). All remain unmerged by this task.

1. Can code be simplified? Direct registrations in `src/server.ts:43-56` suffice. No shared provider abstraction is needed. Preserve independent media and deck cleanup through `Promise.allSettled`. Conflicts affected only server composition and smoke scripts; no provider feature code changed.
2. Can documentation be clearer? The coverage ledger corrects `additionalScopes` naming, retains historical focused-branch counts, and separates arithmetic proof from source authenticity. This review replaces the false statechart-skill-unavailable claim. Both writing skills were applied.
3. Does behavior need a statechart? Yes. Clip transfer and private-media shutdown contain concurrency and failure rules. The installed primary-checkout skill was read read-only. [Clip reproduction](../statechart/18-clip-lifecycle/reproduce.md) and [media reproduction](../statechart/18-media-lifecycle/reproduce.md) include models, configs, views, reports, and charts. TLC exits 0: clip 13 states/25 steps; media 9 states/20 steps. Both pass four invariants and deadlock checks. Lifecycle regression tests exit 0, 27 passed. These bounded models do not prove network delivery or provider responsiveness.

## Correctness review

| Area | Evidence |
| --- | --- |
| Clip authorization | `src/adapters/twitch/clips-service.ts:18-24` checks scope/ownership inside account callback, then fetches binary outside it without Twitch credentials. |
| Artifact safety | `src/adapters/twitch/clip-artifact.ts:9-13,43-88` restricts host, redirects, size, permissions, and partial cleanup. Live delivery remains unverified. |
| Media isolation | `src/adapters/media/provider.ts:29-49,73-90` validates private configuration before lazy frontend start. Listener inspection is not authentication. |
| Game authorization | `src/adapters/igdb/twitch-games.ts:24-49` reuses application tokens, independent of streamer OAuth. |
| Metric arithmetic | `src/analytics/broadcast-duration.ts:33-70` validates duplicate IDs, unions intervals, intersects coverage, and exposes gaps. |
| Combined shutdown | `src/server.ts:50-56` attempts both media and deck cleanup and sanitizes failures. |

The read-only provider reviewer found no confirmed provider defect in reviewed paths. Integration retained all registrations, #53 profile, missing-media error checks, invalid game input checks, metric assertions, and mock isolation.

## Consolidated validation

Host: macOS, Bun 1.4.4, MCP SDK Client over bundled stdio. Initial sandboxed mise attempts exited 1 because managed runtime/cache access was denied. Approved-access reruns produced these results.

| Command | Exit | Result |
| --- | --- | --- |
| `mise run install` | 0 | Locked dependencies. |
| `mise run hooks:install` | 0 | Existing global hooks retained. |
| `mise run check` | 0 | TypeScript passes. |
| `mise run test` | 0 | 164 tests, 21 files, 830 assertions. |
| `mise run build` | 0 | Server, UI, worker, adapter built. |
| `mise run smoke` | 0 | 33 tools; metric 6300 seconds and 900-second gap; missing optional media; mock isolation. |
| `mise run package` | 0 | 132 inspected archive entries. |
| `mise exec -- fnox --config <existing-primary-cache> --non-interactive exec -- bun scripts/package-smoke.ts` | 0 | Packaged fnox launch; 33 tools. |
| Same cache wrapper with `bun tests/igdb-stdio.ts` | 0 | Category 33214 maps to IGDB 1905 through combined bundle. |
| `mise run hooks:check` | 0 | Markdown, whitespace, secrets pass. |

[Sanitized combined game result](../verification/18-media-integration/game-lookup.json) records 33 tools and public metadata. Verification used the existing primary age-encrypted overlay without copying, refreshing, or printing secrets. The historical #41 proof was restored after saving the new result separately.

First suite HEAD stayed `8f892dd0dad8187118c1b4e55302c03c2cb47a02`; before/after files are under `docs/verification/18-media-integration/`. Final checks after documentation and packaging assertions are recorded below.

## Acceptance limits

- #39: missing `channel:manage:clips` consent, real download, and playback.
- #40: private provider absent. Missing-config behavior is verified, not live transcript acceptance.
- #41: text and artwork reference verified, not graphical artwork rendering or redistribution rights.
- #42: synthetic report proves arithmetic, not real source authenticity or complete history.

No OAuth flow, provider start, deployment, broadcast, automation, artwork download, or graphical UI change occurred. Screenshots do not apply to protocol-only integration. Epic #18 remains open and In Progress.

## Retained worktrees and processes

All ten worktrees remain. Initial inspection found no unrelated tracked or untracked edits. Ignored caches, exports, dependencies, and build products remain with their owners.

| Worktree | Owner and next step |
| --- | --- |
| Primary `stream-machine-plugin`, main at `9c5e297` | Coordinator. Retained unchanged; reconcile with remote later. No local-only commit relative to all remote refs. |
| `/private/tmp/stream-machine-secrets` | #70 owner. Retain encrypted cache and exports. |
| `feat/39-clip-download` | #39 owner. Retain for consent and review. |
| `feat/40-media-info` | #40 owner. Retain for private-provider verification. |
| `feat/41-game-lookup` | #41 owner. Retain for review. |
| `feat/42-streaming-metric` | #42 owner. Retain for review and source acceptance. |
| Integration worktree | This task. Commit/push and confirm upstream match. |
| `stream-machine-demo` | Demo owner. Worker PID 91601 uses this source; preserve. |
| `stream-machine-native-46` | #46 owner. Preserve local-only commit `94371ca816406730c8df752991fcbd5bf1c159d9`; reconcile separately. |
| `stream-machine-twitch-53` | #53 owner. Retain ignored cache and exports. |

Installed desktop plugin host groups rooted at PIDs 19122, 64056, and 91658 remain. CUA processes 67565 and 67566 use primary checkout. No process was stopped. Integration validation processes exit after requests.

## Published evidence and final handoff

Pending final validation, push, draft PR, evidence publication, read-back, and clean upstream check.
