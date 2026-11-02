# Retained worktrees during issue 136

Snapshot taken before the storage evidence commit on November 1, 2026. No worktree or worker was removed.

| Checkout | State and owner | Next step |
| --- | --- | --- |
| Primary `stream-machine-plugin` | Main behind origin by two commits. Untracked `src/ui/twitch_login.png` predates this task; owner unconfirmed. | Preserve image. Reconcile primary checkout separately. |
| `/private/tmp/stream-machine-docs-126` | Clean, upstream deleted. Issue 126 owner. | Owner verifies merge before cleanup. |
| `/private/tmp/stream-machine-oauth-122` | Clean, tracks upstream. Issue 122 owner. | Retain OAuth source context. |
| `/private/tmp/stream-machine-review-127` | Clean, tracks upstream. Issue 127 owner. | Retain review work. |
| `rp-agent-d7047a0d-feat-18-media-integration-9fafbb41` | Clean, behind upstream by one commit. Issue 18 owner. | Owner reconciles before cleanup. |
| `rp-agent-d94af7be-feat-40-media-info-906b7ab4` | Clean, behind upstream by five commits. Issue 40 owner. | Owner reconciles before cleanup. |
| `rp-agent-e27d02a8-feat-42-streaming-metric-6cc74b06` | Clean, tracks upstream. Issue 42 owner. | Retain. |
| `rp-agent-ec343fb3-feat-41-game-lookup-242fd5d7` | Clean, behind upstream by one commit. Issue 41 owner. | Owner reconciles before cleanup. |
| `stream-machine-demo` | Clean, upstream deleted. Demo worker running from this checkout. | Owner approval required before moving or stopping worker. |
| `stream-machine-hosted-130` | Active source edits owned by issue 130 chat. | Owner integrates storage, validates, deploys, commits, and pushes. |
| `rp-worktree-codex-136-user-storage-f26e0aee-be1a2f2d` | This task's evidence and patch pending commit at snapshot. | Commit and push evidence. Retain separate Site source for integration. |

No retained branch showed local-only commits against its available upstream. Missing upstream branches require separate merge verification, not automatic deletion.

The ignored `docs/hosted-oauth-site/` checkout contains this task's implementation, generated standalone Drizzle metadata, and copied shared-client test dependencies. The committed patch preserves implementation changes. Issue 130 owns the authoritative combined schema metadata and sole Site deployment. Keep this independent checkout until integration is verified.

Installed Stream Machine MCP processes and the existing demo worker were left running. The initial process inventory also showed issue 130's RepoPrompt builder and TypeScript language servers for the primary checkout. No task-specific preview server was started.
