# Issue 40 implementation plan

Implement only the optional private metadata provider from the approved media epic export, `oracle-plan-2026-11-01-141157-media-epic-plan-fadf-ed8d.md`.

## Scope and decisions

Own `src/adapters/media`, media tests, this plan, `docs/demos/media-info.md`, and the issue review. The first shared integration slot permits `src/server.ts` registration and cleanup plus `scripts/smoke.ts`. Twitch, IGDB, analytics, UI, and mock domain modules remain unchanged.

The worktree is `rp-agent-d94af7be-feat-40-media-info-906b7ab4`, branch `feat/40-media-info`, starting at `9c5e2970b7dd693672292ee0b53c71c10f33c863`. RepoPrompt confirmed worktree binding before edits. Initial status was clean. Existing #40 supplies the implementation issue and labels.

The upstream review pins `e584553cb5be972b87711de0d191f2489e7ff8fb`. Its Python service has no authentication. Following the user's correction, configuration fails closed unless local listener inspection proves an IPv4 loopback-only listener. The adapter does not start or modify a service deployment.

## Implementation and verification

1. Review pinned tool schemas, response envelopes, credential fallback, logging, listener defaults, and license before implementation.
2. Add a lazy stdio client, strict single-video validation, metadata normalization, explicit transcript states, bounded text, sanitized failures, and child cleanup.
3. Check native service listeners before launch and each request. Reject unsafe or uninspectable bindings.
4. Add fixture tests and real native listener tests. Add MCP registration and bundled unconfigured-provider checks.
5. Run TypeScript, full tests, build, smoke, package, and hooks. Record actual exits in the review.
6. Review simplification, writing, lifecycle explanation, and issue completion. Commit and push focused changes. Open a PR and publish evidence. Keep #40 open and In Progress. Do not merge.

## Acceptance blocker

Neither provider configuration variable is available. No live service is changed. A real one-URL demo requires an approved existing private service and installed pinned frontend. Automated checks establish adapter behavior, not live upstream acceptance.

The approved export remains owned by the parent media plan and is not removed by this issue.
