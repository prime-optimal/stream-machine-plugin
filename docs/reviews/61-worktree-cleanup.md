# Branch and worktree cleanup

[Issue #61](https://github.com/prime-optimal/stream-machine-plugin/issues/61) tracks this cleanup after PR #60 merged. The audit ran on 2026-11-01.

## Removed work

Nine existing worktrees and nine local branches were removed. Four obsolete remote branches were deleted with exact-tip leases. The temporary cleanup worktree is removed after this report is pushed.

The following worktrees passed the file and history checks:

| Worktree suffix | Local branch | Local tip |
| --- | --- | --- |
| `creative` | `codex/43-creative-reuse` | `10822f4` |
| `deck` | `codex/31-streamdeck-demo` | `6d50db7` |
| `docs` | `codex/5-technical-writing` | `e9cbad0` |
| `obs` | `codex/28-obs-demo` | `79c1fa3` |
| `roadmap` | `codex/9-parallel-roadmap` | `4b2b2f0` |
| `twitch` | `codex/25-twitch-reuse` | `d5655b0` |
| `ui` | `codex/46-live-demo-ui` | `55a955a` |
| `worker` | `codex/36-background-demo` | `6cf3e69` |
| `/tmp/stream-machine-hygiene` | `codex/59-repo-hygiene` | `308bbc3` |

The first eight paths had the prefix `/Users/prime/Documents/ChatGPT/stream-machine-`.

Remote branches `codex/5-technical-writing`, `codex/59-repo-hygiene`, `codex/9-parallel-roadmap`, and `test/nlpm-models` were deleted. The test branch belonged to closed PR #6, which was explicitly not intended for merge.

Local `main` now points to `3914582`, the merged PR #60 commit. No application files or live provider settings changed.

## Preserved histories and files

Squash integration gave many original feature commits different IDs. OBS and worker files matched `main`. Other feature files matched apart from terminology corrections and later integration changes. The merged hygiene, roadmap, and integration branch trees matched their squash merge trees.

Before deletion, ten branch tips were pushed as tags under `archive/2026-11-01/`. Each tag name ends with the original branch name. The archived hygiene tip is `8745937`, which includes the remote follow-up commit after local `308bbc3`.

Each tag was checked against the remote before its branch was deleted. The archive includes the closed test branch. The original feature histories remain recoverable even when squash integration prevents Git from recognizing an ancestor.

Two local planning files were copied byte for byte, committed, and pushed before worktree removal:

- [UI plan](../archive/2026-11-01/ui-plan.txt) preserves the untracked UI planning export.
- [Integration plan](../archive/2026-11-01/integration-plan.txt) preserves the ignored integration planning export. The source remains in the active integration worktree.

The archive files retain their historical wording. The vocabulary checker excludes `docs/archive/**` so it does not rewrite source records.

## Work kept

Two existing worktrees remain:

- `/Users/prime/Documents/ChatGPT/stream-machine-plugin` stays on `codex/1-plugin-architecture`. It has existing edits to nine tracked documentation or skill files, plus local agent files, reviews, statechart files, and other untracked docs. Cleanup preserved that mixed tree.
- `/Users/prime/Documents/ChatGPT/stream-machine-demo` stays on `codex/49-demo-integration`. Worker process `91601` still executes source and an adapter from that directory. Removing it would break the running worker. The process remained running after cleanup.

The corresponding remote branches remain. The new `codex/61-worktree-cleanup` branch remains until its report and archives are merged.

## Checks

The audit inspected tracked, untracked, and ignored files. Useful planning files were preserved. Remaining ignored files in removed worktrees were build outputs or `.DS_Store` files.

The clean OBS worktree was removed first. After that succeeded, the remaining eight candidates were checked again and removed with ordinary `git worktree remove`. No forced worktree removal or broad directory deletion was used.

After cleanup, Git worktree metadata was pruned, remote refs were refreshed, and remaining branches were listed. The removed directories had occupied about 150 MiB according to `du`. Rounded filesystem free space remained 4.3 GiB, so that measurement does not establish exact physical space reclaimed.

Commit hooks passed. The preservation commit's pre-push hook passed TypeScript checks and all 68 tests.

## Review findings

The review answered each project question:

1. Code simplification. No product code changed. Cleanup removed obsolete checkouts and branch names while retaining remote recovery tags.
2. Documentation clarity. This report names removed and retained work, gives retention reasons, and links the original planning records.
3. Statechart need. No model or chart change is needed. The cleanup changes Git metadata and local checkout directories, not product behavior.

## Restore archived work

To restore the OBS branch in a new worktree, run these commands from the primary checkout:

```sh
git fetch origin --tags
git worktree add ../stream-machine-obs -b restore/obs archive/2026-11-01/codex/28-obs-demo
```

Install the restored worktree's dependencies before running its tools.
