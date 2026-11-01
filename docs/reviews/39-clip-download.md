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

The existing Twitch token store is present, but this worktree has no `fnox.local.toml` encrypted cache. Prerequisite existence checks returned 0 for the store and 1 for the cache. No secrets were printed, copied, refreshed, or added. No real authorization, scope validation, clip download, or playback occurred. Those acceptance criteria remain unmet. No playback screenshot exists to attach, and synthetic tests are not playback evidence.

Next step: workstation owner provisions the approved encrypted cache, then verifies the existing account's clip grant. If missing, explicit consent is required. Download a broadcaster-owned clip and play the result before marking real acceptance complete.

## Retained worktrees and processes

Read-only inventory found clean primary, secrets, demo, and Twitch #53 worktrees. Native #46 is clean but retains local-only commit `94371ca`; its session owner must publish or preserve that verification commit. No cleanup was attempted.

Sibling worktrees #40, #41, and #42 contain active edits owned by their sessions. Keep them. Their next step is independent verification and handoff. Their inventory is a point-in-time observation, not a promise that other sessions stopped writing.

Demo worker PID `91601` runs from `stream-machine-demo/src/worker/main.ts` with its existing adapter. The demo owner retains it. It was neither stopped nor modified. This task leaves no new server or worker running.

## Issue evidence

Keep #39 open and Board status `In Progress` while the PR awaits review and merge and real acceptance remains unmet. Preserve unchecked real acceptance criteria. Publish command exits and these limitations in a new issue comment, then read it back. No merge or issue close is authorized.
