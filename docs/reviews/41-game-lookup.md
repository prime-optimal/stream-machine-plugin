# Game lookup module review

## Scope

Review covers the isolated #41 module. It excludes server assembly, shared smoke tests, and sibling auth, media, and analytics changes.

## Required review questions

1. Simplification: five small files separate HTTP faults, application token ownership, IGDB response validation, lookup composition, and MCP registration. No general catalog or new OAuth store is needed.
2. Documentation: `docs/demos/games.md` distinguishes live provider proof from fixture tests and pending plugin integration. It names exact credential variables, provider hosts, absent mappings, and artwork limits.
3. Statechart: the existing broadcast and worker model is unchanged. This bounded read has no persistent workflow or approval states. No statechart update is needed.

## Evidence and limitations

- `src/adapters/igdb/twitch-games.ts:18-47` caches app tokens, shares acquisition, bounds unauthorized retries, and validates category identity and mapping.
- `src/adapters/igdb/client.ts:14-30` builds a numeric-only query and validates returned identity and artwork reference.
- `src/adapters/igdb/register.ts:8-23` exposes read-only registration and sanitized faults without changing server composition.
- `tests/igdb.test.ts:25-119` covers ID injection, mapping failure, malformed data, response mismatch, absent artwork, provider failures, refresh, and real in-memory MCP calls.

Real Fortnite mapping completed with exit 0. Check, full tests, and build passed. Initial TypeScript check failed on the default environment type; the explicit environment projection fixed it.

`mise run hooks:check` passed with exit 0 after adding the missing blank line before the contract-source list. The secret scan and whitespace checks passed.

Oracle review could not start. CLI returned "only available during discovery or agent mode runs". MCP fallback reported an unresolved selected export before sending. No Oracle review result exists; the review above is manual.

## Retained worktrees and processes

At the pre-commit inventory, #39's `feat/39-clip-download` worktree contained auth, clip, and smoke edits owned by that sibling. #40's `feat/40-media-info` worktree contained media, server, and smoke edits owned by that sibling. Neither tree was changed here. Their owners finish verification and push.

Other worktrees had no tracked or untracked edits at inspection. The native verification worktree retained local-only commit `94371ca`, owned by #46. Its owner must verify preservation before cleanup. No worktree was removed.

The demo worktree still hosted Bun worker PID 91601. Installed plugin server processes also remained. These belong to existing demo and host sessions; their owners control shutdown. This task started no persistent worker. The coordinator's RepoPrompt wait process remained active.

Issue #41 and its board item were read as open and In Progress at the module handoff.

## Integration review

The user independently verified unchanged `03254f4` and granted the integration slot. This follow-up adds two lines to `src/server.ts:8,46`: the game-registration import and call. The existing shutdown handler is untouched. No sibling commits were copied.

Simplification: registration is a direct call, with no lifecycle owner because the game module holds no persistent transport. The coordinator can retain #40's `Promise.allSettled` cleanup unchanged when combining branches.

Documentation: the demo now records bundled host text and an artwork reference, while explicitly excluding graphical verification. `tests/igdb-stdio.ts` reproduces the real lookup with credentials passed only in the child environment. The sanitized result is stored in `docs/verification/41-game-lookup.json`.

Statechart: no broadcast, worker, approval, or persistent state transition changed. No chart update is needed.

Check, 110 tests, build, smoke, package, packaged stdio launch, and real bundled lookup all exited 0. Branch-specific smoke expects 28 tools and checks the game tool name. This is not the final combined feature count.

For #42's next slot, retain the import from `./adapters/igdb/register` and the `registerGameTools(server)` call after worker registration. Add analytics registration separately and recompute combined smoke counts. Do not replace #40's media cleanup with this branch's older baseline handler.

The PR remains unmerged. Issue #41 remains open and In Progress. No graphical evidence was produced; no screenshot is required for this text and URL output.
