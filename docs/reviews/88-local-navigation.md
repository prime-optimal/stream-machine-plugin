# Issue 88 local navigation review

## Delivered scope

Persistent Home, Assets, Clips, Stream Deck, and Connections menu. Assets and Stream Deck reuse existing live controls. Clips explicitly lacks a gallery and player. Tools retains OBS, title approval, and worker actions. Mock demo remains fictional and separately resettable.

Navigation hides retained nodes rather than recreating controls. It makes no tool calls. Connections uses explicit authenticated status checks, rejects stale responses, preserves the 12-scope consent policy, and keeps permission details collapsed. Connect creates a link, never verification. Native link opening uses `App.openLink` with denial/error fallback. No disconnect control was invented.

Sources: `src/ui/navigation.ts:15-34`, `src/ui/app.ts:150-185`, `src/ui/connections.ts:32-166`, `src/ui/live-demos.ts:112-130`.

## Required review findings

1. Simplification: reuse existing card closures and shared mutation guard. Removed unused live-page container construction. No new workflow framework or provider abstraction.
2. Documentation and copy: kept scope strings in the disclosure, removed issue/tool jargon from Connections, and labeled synthetic screenshots. The raw builder export is historical planning context; controlling findings and this report define the delivered slice.
3. Statechart: added [bounded model and reproduction](../statechart/88-local-navigation/README.md). TLC checked 190 states and 869 steps with seven invariants and deadlock checks passing. It abstracts menu destinations and scope completeness; it does not prove host or provider behavior.

One Oracle review found focus loss during Connections rerender and lost Mock disclosure state. Both were corrected. Pending checks focus the status region, completion restores the initiating button only while focus stays in the panel, and navigation prevents focus theft. Mock collapse survives rerender. No second review was requested.

## Verification

Commands used the pinned repository mise tasks.

| Command | Exit | Result |
| --- | --- | --- |
| `mise run install` | 0 | Locked dependencies installed in this worktree |
| `mise run hooks:install` | 0 | Existing global hk hooks recognized |
| `mise run check` | 0 | TypeScript passed |
| `mise run test` | 0 | 149 passed, 0 failed, 868 assertions |
| `mise run build` | 0 | UI/server/worker bundles produced |
| `mise run smoke` | 0 | 31 tools, mock isolation, UI resource, adapter registration |
| `mise run package` | 0 | 220 archive entries inspected |
| `mise run hooks:check` | 0 | Markdown, whitespace, staged-secret checks passed |
| Synthetic browser assertions | 0 | See current observations and screenshots linked below |
| TLC statechart run | 0 | 190 states, 869 steps |

The initial hook run found formatting in generated Markdown. Explicit formatting fixed those files; the check-only rerun passed. The first sandboxed mise setup attempt could not write its trust cache; approved execution succeeded.

[Synthetic browser evidence](../verification/88-local-navigation/README.md) records exact browser versions, commands, assertions, narrow/wide screenshots, and shutdown. No live OAuth grant or provider action ran. Runtime tests reproduce delayed check, reconnect, and old-response rejection from the model. Unit tests separately cover malformed/mock envelopes, account changes, missing grants, duplicate starts, unsafe links, and SDK refusal.

## Remaining gates

This is local section navigation, not the full #88 route/lifecycle contract. #87 still owns named-host routing, deep links, transport, media, and host proof. #92 owns authenticated OBS configuration. #93 owns full contextual provider onboarding and account/task lifecycle. No server URI, CSP, provider, API, auth, or primary-checkout files changed. Native cache versioning remains coordinator-owned before deployment.

Issue #88 stays open and In Progress while required work awaits merge and broader acceptance. Issue #93 stays open. Evidence is published as an issue comment with inline screenshots after push; final handoff links that comment.

## Retained work and processes

Primary `/Users/prime/Documents/ChatGPT/stream-machine-plugin` retains dirty `fnox.toml`, owned by the user/coordinator. Do not clean or commit it here.

Other clean retained worktrees have commits absent from all remote refs: `/private/tmp/stream-machine-reflect-100` (1), `/private/tmp/stream-machine-ux-review-86` (1), scope-83 worktree `rp-agent-faf7449c-fix-83-initial-twitch-scopes-2440ae1c` (1), `stream-machine-native-46` (1), `stream-machine-transcribe-85` (1), and `stream-machine-ux-81` (3). Owners are their corresponding task sessions. The coordinator must reconcile these refs before cleanup. This task preserves them.

The process scan found no matching worker, demo-worker, real preview, or task fixture process at inspection. Browser QA records its own fixture/browser shutdown separately. No unrelated process was stopped. Ignored local `node_modules`, `dist`, and package archive remain as reproducible build outputs.
