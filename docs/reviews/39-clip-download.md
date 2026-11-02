# Issue 39 review and verification

## Scope

Only #39 is implemented. OAuth reuses closed #25. No changes to `src/server.ts`, UI, worker, media-info, IGDB, or analytics. User authorized `scripts/smoke.ts` inventory updates for the two clip tools. This branch expects 29 tools. #40 has an independent smoke edit; reconcile inventory during integration, not by replacing either branch's tool assertions.

## Review findings

1. Simplification: `clips-service.ts:5-27` keeps account checks and process-wide concurrency in one service. The client and writer own separate network boundaries. No general asset framework is needed.
2. Documentation: reviewer found the runtime's `requestedScopes` omitted stored grants. `local-runtime.ts:95-99` now returns `additionalScopes` for explicit flags; upstream `service.ts:14-19` reports effective requested scopes. `docs/demos/clips.md` explains the distinction. The 120-second deadline claim now excludes awaited filesystem operations, which can exceed the network deadline on a stalled disk.
3. Statechart: the new lifecycle needs its own reference. [Clip download lifecycle](../statechart/39-clip-download.md) documents success, failure, cleanup, and concurrency transitions. Existing worker and title models remain unchanged. The session has no installed `statechart` skill, so formal model-checker reproduction remains unavailable.
4. Registration: review requested a successful real in-memory MCP call. `tests/twitch-clips-registration.test.ts:30-44` checks public metadata output and token redaction, in addition to schema rejection tests.

No high-severity security finding was reported by the independent read-only review. Oracle review was attempted through CLI and MCP but blocked by `targetActivationMismatch` and a stale selected export path. No review success is claimed for Oracle. The independent reviewer inspected current files instead.

## Verification

Test-first failures were recorded before implementation: OAuth assertions failed, clip imports were absent, and artifact imports were absent. All returned exit 1. The first complete suite passed 100 tests. Initial smoke returned exit 1 because it expected 27 tools instead of 29. The assertion now includes both clip names.

Dependency install and hook setup returned exit 0. Final validation ran on Bun 1.4.4, macOS arm64, after the review fixes:

| Command | Exit | Result |
| --- | --- | --- |
| `mise run check` | 0 | TypeScript passed |
| `mise run test` | 0 | 101 tests passed, 562 assertions |
| `mise run build` | 0 | Server, UI, and worker bundles built |
| `mise run smoke` | 0 | 29 tools, mock isolation, UI resource |
| `mise run package` | 0 | 111 archive entries inspected |
| `mise run hooks:check` | 0 | Markdown, whitespace, staged-secret checks |

HEAD remained `9c5e2970b7dd693672292ee0b53c71c10f33c863` throughout validation. Build and package outputs are ignored generated files, not source changes.

## Real acceptance limits

Initial prerequisite checks found the token store but no worktree-local encrypted cache. The user then authorized read-only use of the primary checkout's existing encrypted overlay, matching #41 setup provenance. `fnox --non-interactive -c /Users/prime/Documents/ChatGPT/stream-machine-plugin/fnox.local.toml exec` supplied credentials without copying or refreshing the cache.

A read-only SQLite lookup decrypted the existing token in memory, then called Twitch token validation once. Exit 0 confirmed account `1494553296`, matching client and user identity, with only `channel:manage:broadcast`. `channel:manage:clips` was absent. No token refresh, new OAuth, source cache mutation, download, or playback occurred. Real account validation is verified, but clip consent, download, and playback remain unmet. No playback screenshot exists to attach.

Next step: obtain explicit consent for `channel:manage:clips` through the existing OAuth flow. New OAuth was outside the follow-up authorization. Then download a broadcaster-owned clip, play the result, and publish visual evidence before marking real acceptance complete.

## Retained worktrees and processes

Read-only inventory found clean primary, secrets, demo, and Twitch #53 worktrees. Native #46 is clean but retains local-only commit `94371ca`; its session owner must publish or preserve that verification commit. No cleanup was attempted.

Sibling worktrees #40, #41, and #42 contain active edits owned by their sessions. Keep them. Their next step is independent verification and handoff. Their inventory is a point-in-time observation, not a promise that other sessions stopped writing.

Demo worker PID `91601` runs from `stream-machine-demo/src/worker/main.ts` with its existing adapter. The demo owner retains it. It was neither stopped nor modified. This task leaves no new server or worker running.

## Issue evidence

[PR #76](https://github.com/prime-optimal/stream-machine-plugin/pull/76) contains implementation commit `9abfe617d2e766fae3790db07c414c97b82b80a1`. [Published issue evidence](https://github.com/prime-optimal/stream-machine-plugin/issues/39#issuecomment-6564710998) was read back successfully. [Follow-up account evidence](https://github.com/prime-optimal/stream-machine-plugin/issues/39#issuecomment-6564721088) corrects the initial cache blocker and records the verified missing clip grant. That comment was also read back. No visual attachment is claimed because real playback remains unverified.

The read-back confirmed #39 `OPEN` and Board status `In Progress`. Real acceptance checkboxes remain unchecked. PR remains unmerged. After push and fetch, `mise run git:handoff` returned 0 and confirmed a clean worktree matching upstream. Before reconciliation, GitHub reported PR merge state `DIRTY` against main. The reconciliation record below supersedes that blocker. No GitHub PR merge or issue close is authorized.

## Reconcile main with clip tools

The user authorized a normal merge of `origin/main` at `de577ad`, containing merged #53 and PR #75, into issue branch HEAD `6ea8957`. Binding, physical path, clean status, and both revisions were checked before `git merge --no-commit --no-ff origin/main`. Only `scripts/smoke.ts` conflicted.

The resolution preserves `stream_machine_twitch_profile` and both clip tools. `scripts/smoke.ts:12-15` and `scripts/package-smoke.ts:23-26` now assert exactly 30 tools and all three names. The profile read-only assertion remains. Twitch registration retains the clip consent flag and lazy shared runtime while adding main's profile dispatch. No `src/server.ts` or sibling worktree edits were made.

Review answers:

- Simplification: retain existing registration and add only inventory assertions. No new abstraction or runtime behavior is needed.
- Writing: historical 29-tool results remain labeled as earlier evidence. This section records current 30-tool validation. The package report derives its printed count from the actual inventory.
- Statechart: no lifecycle or transition changed during reconciliation. The clip chart and main's profile behavior need no state changes.

Independent read-only review confirmed main's client, service, and profile tests match `de577ad`, while clip modules, auth, and clip tests match `6ea8957`. No actionable merge regression was found.

Validation before the merge commit used Bun 1.4.4 on macOS arm64:

| Command | Exit | Result |
| --- | --- | --- |
| `mise run check` | 0 | TypeScript passed |
| Targeted clip, OAuth, profile, and title tests through `mise exec -- bun test` | 0 | 50 tests passed, 332 assertions |
| `mise run test` | 0 | 107 tests passed, 684 assertions |
| `mise run build` | 0 | Bundles built |
| `mise run smoke` | 0 | Exactly 30 tools and UI resource |
| `mise run package` | 0 | 118 archive entries inspected |
| `mise run hooks:check` | 0 | Markdown, whitespace, and staged-secret checks passed |
| `mise exec -- fnox --non-interactive -c <primary encrypted overlay> exec -- bun scripts/package-smoke.ts` | 0 | Packaged launcher exposed 30 tools; existing Twitch connection configured |

The packaged check used the authorized existing encrypted overlay without copying or refreshing it. It called status, not connect or download. Missing clip consent, real download, and playback acceptance remain unchanged. No broadcasts, title changes, or worker controls ran. Other task worktrees and the demo worker remain separate and untouched.
