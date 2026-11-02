# Retained worktrees

Snapshot: 2026-11-01, before the final task commit. No worktree was removed. This task stopped its own preview server after verification. Historical branch commits can have squash-merge equivalents; local commit counts do not prove unmerged changes.

| Worktree | Branch | Status | Commits absent from origin refs | Owner and next step |
| --- | --- | --- | --- | --- |
| /Users/prime/Documents/ChatGPT/stream-machine-plugin | main | ?? src/ui/twitch_login.png | 0 | Prior task/user: retain; reconcile separately before cleanup. |
| /private/tmp/stream-machine-docs-126 | chore/126-oauth-scopes | Clean | 1 | Prior task/user: retain; reconcile separately before cleanup. |
| /private/tmp/stream-machine-oauth-122 | feat/122-hosted-oauth-test | Clean | 0 | Prior task/user: retain; reconcile separately before cleanup. |
| /private/tmp/stream-machine-review-127 | chore/127-hosted-oauth-review | Clean | 0 | Prior task/user: retain; reconcile separately before cleanup. |
| /Users/prime/Documents/ChatGPT/.repoprompt-worktrees/stream-machine-plugin/rp-agent-d7047a0d-feat-18-media-integration-9fafbb41 | feat/18-media-integration | Clean | 0 | Prior task/user: retain; reconcile separately before cleanup. |
| /Users/prime/Documents/ChatGPT/.repoprompt-worktrees/stream-machine-plugin/rp-agent-d94af7be-feat-40-media-info-906b7ab4 | feat/40-media-info | Clean | 0 | Prior task/user: retain; reconcile separately before cleanup. |
| /Users/prime/Documents/ChatGPT/.repoprompt-worktrees/stream-machine-plugin/rp-agent-e27d02a8-feat-42-streaming-metric-6cc74b06 | feat/42-streaming-metric | Clean | 0 | Prior task/user: retain; reconcile separately before cleanup. |
| /Users/prime/Documents/ChatGPT/.repoprompt-worktrees/stream-machine-plugin/rp-agent-ec343fb3-feat-41-game-lookup-242fd5d7 | feat/41-game-lookup | Clean | 0 | Prior task/user: retain; reconcile separately before cleanup. |
| /Users/prime/Documents/ChatGPT/.repoprompt-worktrees/stream-machine-plugin/rp-worktree-codex-136-user-storage-f26e0aee-be1a2f2d | codex/136-user-storage | Clean | 0 | Issue136: PR141 pending; retain. |
| /Users/prime/Documents/ChatGPT/stream-machine-demo | codex/49-demo-integration | Clean | 33 | Demo worker owner: retain active source; owner approval required before stopping. |
| /Users/prime/Documents/ChatGPT/stream-machine-hosted-130 | codex/130-hosted-mcp | M docs/decisions.md;  M plugin.json;  M scripts/package-archive.ts;  M scripts/package-smoke.ts;  M scripts/package.ts;  M skills/onboarding/SKILL.md;  M skills/preview-recipe/SKILL.md;  M skills/self-update/SKILL.md;  M src/adapters/twitch/register.ts;  M src/adapters/twitch/service.ts;  M src/auth/local-runtime.ts;  M tests/package-archive.test.ts;  M tests/twitch.test.ts; ?? docs/hosted-mcp.md; ?? docs/plans/130-hosted-mcp.md; ?? docs/reviews/130-hosted-mcp.md; ?? docs/reviews/130-hosted-site.patch; ?? docs/statechart/130-hosted-mcp/; ?? mcp.local.json; ?? scripts/sync-hosted-twitch.ts; ?? src/adapters/twitch/title-preview-store.ts; ?? src/adapters/twitch/tool-register.ts; ?? src/adapters/twitch/tool-runtime.ts; ?? tests/twitch-shared-runtime.test.ts | 0 | Issue130: finish commit/push and retain pending review. |

## Running processes

- /Users/prime/Documents/ChatGPT/stream-machine-plugin: PIDs 26612, 26613, 85396, 85397, 88572, 88574. Preserve existing owners; this task stops only its own preview server.
- /Users/prime/Documents/ChatGPT/stream-machine-demo: PIDs 91601. Preserve existing owners; this task stops only its own preview server.
- /Users/prime/Documents/ChatGPT/stream-machine-hosted-130: preview PID 98517 was stopped after verification. No task-owned preview remains.

The ignored Site source at docs/hosted-oauth-site has its own Git history. Keep it for source synchronization and deployment review. Its generated node_modules was removed after final build and publication because the disk reported ENOSPC; reinstall Site dependencies before another Site check or build. Root dependencies and build outputs remain. The primary checkout keeps the pre-existing untracked src/ui/twitch_login.png; its user owns disposition.
