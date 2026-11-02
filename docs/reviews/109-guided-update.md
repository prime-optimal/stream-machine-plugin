# Guided update review

## Findings

1. Code simplification: two MCP tools and one skill reuse GitHub metadata and Plugin Creator. No custom release manifest or account database is needed. `src/update/releases.ts` checks stable numeric versions and canonical asset identity. `src/update/archive.ts` uses maintained `tar` parser, aborts on unsafe entries, and requires actual files at runtime paths.
2. Documentation: `docs/self-update.md` distinguishes running version, prepared archive, saved release, and reload. `skills/self-update/SKILL.md` requires fresh Creator identity and release preconditions, archive rehash, post-save read-back, and conflict recovery. Missing release is unavailable, not current.
3. Statechart: publication uncertainty and reload need separate states. The separate reviewer checked `docs/statechart/109-guided-update/`: TLC exited 0 with thirteen states and seventeen steps; four invariants and NoDeadlock hold.

Read-only review found parser limits previously rejected only after EOF, required paths accepted directory impostors, and unrelated assets were size constrained. All corrected; regression fixtures cover these findings.

## Validation

Local `bun test tests/update.test.ts`: exit 0, five tests, twenty assertions. `bun run check`: exit 0 before final fixture addition. Full validation results follow below.

`mise run install` and `mise run hooks:install`: exit 0. `mise run check` and `mise run test` inside sandbox: blocked by operating-system permissions. Escalation requests were interrupted without execution results. Local Bun commands provide equivalent task bodies where possible; no pass is claimed for blocked mise invocations.

Full local tests hit EventSub socket `EADDRINUSE` and worker process restrictions in sandbox. These are verification limitations, not update passes. No live GitHub release or Plugin Creator update was published. No automatic host reload was verified.

## Handoff inventory

Parent inspected nineteen retained worktrees; all clean at initial snapshot. Six histories had commits absent by ID from remote refs: UX review #86, release #105, Twitch #83, native #46, transcription #85, and UX plan #81. Some may be squash equivalents. Preserve for owner review. Existing demo worker PID 91601 and installed MCP processes belong to other sessions; keep running. No cleanup performed.

Final local validation: `bun run check`, `bun run build`, `bun run smoke`, and `bun run package` each exited 0. Smoke discovered 33 tools; package inspected 235 entries before this review file and statechart were added. Five update tests passed with twenty assertions. Full suite finished with 137 passes and 26 failures. Socket, process, and toolchain restrictions were observed, but each failure has not been individually proven environmental. The suite did not pass. `hk check --all` passed Markdown and whitespace but failed its secret step because mise could not execute. An earlier empty-index direct secret check provides no staged-content evidence.

Git staging was subsequently approved and the index populated. The parent owns commit and push. The issue must remain open and In Progress while changes await merge. No release publication, installation, reload, or overall completion is claimed.

Populated-index scanner returned exit 1. Investigation found `gitleaks` resolves to a mise shim that exits 1 even for `gitleaks version` or empty stdin, with `Operation not permitted`. No finding report was produced. The scanner treats that toolchain exit as secret detection, so the result is not content evidence. A meaningful scan remains blocked until gitleaks can run. No suspected secret value was printed.

## Final unrestricted verification

The parent reran `mise run test` with required permissions: exit 0, 163 tests passed, zero failed, 936 assertions. This result supersedes the earlier restricted-environment failures. The parent reran `mise run hooks:check` with required permissions: exit 0. Markdown, whitespace, and the populated-index secret scanner passed. This supersedes the earlier shim failures; no content-secret finding was established. Commit, push, issue evidence, and board read-back remain parent-owned until their results are available.
