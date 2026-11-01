# Issue 42 implementation scope

Implement the approved media epic plan's observed broadcast duration now, as explicitly requested. Issue #42 already exists and remains open. Branch `feat/42-streaming-metric` starts at main commit `9c5e2970b7dd693672292ee0b53c71c10f33c863`.

Own `src/analytics/`, analytics tests, the streaming metric demo, and this issue's plan and review. Do not modify auth, media, IGDB, server assembly, or shared smoke tests. The integration owner must call `registerAnalyticsTools(server)` after the serialized registration slot becomes available.

Implement strict report validation, UTC clipping and interval unions, session-ID deduplication, coverage intersection, explicit gaps, source provenance, and timezone labels. Verify sample arithmetic, partial and empty coverage, timestamp rejection, DST offsets, duplicates, and real in-memory MCP calls. No provider data is invented. No persistence, credentials, provider request, UI, or worker lifecycle changes are needed.

The approved export remains at `prompt-exports/oracle-plan-2026-11-01-141157-media-epic-plan-fadf-ed8d.md` in the primary checkout for sibling use. Worktree binding was checked with RepoPrompt window 1, context `A094EE7C-B51E-4C1F-BE1E-3E14937259C0`, worktree `wt_4841b1921952df3df2e9168a695f5d62b9ae5e294d8d7f806fb5c68cee00a38b`. Physical checkout and clean initial Git status matched that binding.
