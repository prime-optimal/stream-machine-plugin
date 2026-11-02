# Issue 42 implementation scope

Implement the approved media epic plan's observed broadcast duration now, as explicitly requested. Issue #42 already exists and remains open. Branch `feat/42-streaming-metric` starts at main commit `9c5e2970b7dd693672292ee0b53c71c10f33c863`.

Initial scope: own `src/analytics/`, analytics tests, the streaming metric demo, and this issue's plan and review. Initially excluded auth, media, IGDB, server assembly, and shared smoke tests. The authorized integration slot below supersedes the server and smoke exclusion. The integration owner must call `registerAnalyticsTools(server)` after the serialized registration slot becomes available.

Implement strict report validation, UTC clipping and interval unions, session-ID deduplication, coverage intersection, explicit gaps, source provenance, and timezone labels. Verify sample arithmetic, partial and empty coverage, timestamp rejection, DST offsets, duplicates, and real in-memory MCP calls. No provider data is invented. No persistence, credentials, provider request, UI, or worker lifecycle changes are needed.

The approved export remains at `prompt-exports/oracle-plan-2026-11-01-141157-media-epic-plan-fadf-ed8d.md` in the primary checkout for sibling use. Worktree binding was checked with RepoPrompt window 1, context `A094EE7C-B51E-4C1F-BE1E-3E14937259C0`, worktree `wt_4841b1921952df3df2e9168a695f5d62b9ae5e294d8d7f806fb5c68cee00a38b`. Physical checkout and clean initial Git status matched that binding.

## Authorized integration slot

After independent verification at `73e0205`, the user authorized this branch to edit `src/server.ts` and `scripts/smoke.ts`. Add only the analytics registration import and call, plus branch-specific tool inventory and a supplied-report calculation over bundled stdio. Do not import sibling commits or change cleanup. The user inspected #41 registration and confirmed #40 cleanup uses Promise.allSettled. Those sibling changes are not part of this branch. Open a focused PR without merging or closing #42.
