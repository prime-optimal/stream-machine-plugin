# IGDB lookup module plan

Issue #41 owns `src/adapters/igdb/`, `tests/igdb*.test.ts`, and issue-specific documentation. The verified worktree is `feat/41-game-lookup`, based on `origin/main` at `9c5e2970b7dd693672292ee0b53c71c10f33c863`.

Use direct Twitch Games and IGDB reads with an application token. Keep Twitch category IDs separate from IGDB IDs. Validate decimal identifiers, fixed query fields, provider responses, and HTTPS artwork references. Cache tokens in memory, share concurrent acquisition, and retry one rejected token once. Sanitize errors and apply 12-second request deadlines.

Expose `registerGameTools(server)` without changing `src/server.ts` or shared smoke tests. Reuse `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` through fnox. Do not change streamer OAuth.

Verify injected-fetch tests, MCP registration, TypeScript checks, repository tests, build, and hooks. Attempt one real category lookup only with configured credentials. Record missing access honestly. Commit and push the module, publish issue evidence, and await the shared integration slot. Keep the issue open.

The supplied epic export remains the approved plan. Exclude #39 auth, #40 media, and #42 analytics files.
