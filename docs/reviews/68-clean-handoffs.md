# Clean handoff review

[Issue #68](https://github.com/prime-optimal/stream-machine-plugin/issues/68) tracks the completion rules and read-only handoff check.

## Changes

`AGENTS.md` now requires a clean primary checkout on current `main`, task worktrees, a checked final push, and explicit ownership of retained work. Partial hunk commits remain allowed during development.

`mise run git:handoff` checks the current worktree. It rejects tracked edits, staged edits, untracked files, detached HEAD, missing upstream refs, local upstream branches, and commits ahead of or behind upstream. It reads local tracking refs, so the caller must fetch first.

The task does not contact the remote or change files, the index, or refs. It does not inspect ignored files, other worktrees, or running services. The guide assigns those checks to the agent at handoff.

Cleanup instructions now require checking the merged PR head, later commits, running processes, and configured source paths before deletion. A worker's source worktree stays until its owner approves a change and the replacement is verified.

## Verification

The following checks passed:

- Real temporary repositories covered clean branches, ignored files, tracked edits, staged edits, untracked files, unpushed commits, upstream-only commits, detached HEAD, deleted upstream refs, missing tracking configuration, and local upstream branches.
- Each fixture check compared file bytes, index bytes, refs, HEAD, and working-tree status before and after the command.
- The actual shell command rejected the unfinished task worktree before commit.
- Pre-push exposed inherited Git hook variables in the temporary-repository fixture. The fixture now clears inherited Git variables before creating its repositories.
- `mise run hooks:check`, `mise run check`, ShellCheck, and all 69 tests passed.

## Review findings

The review answered each project question:

1. Code simplification. One shell script reads Git state. The mise task calls it directly without a hook, service, or dependency.
2. Documentation clarity. The guide gives the fetch and handoff commands, failure conditions, and checks that still require judgment.
3. Statechart need. No product model changes are needed. The command checks a Git snapshot and performs no transitions or provider actions.

## Retained work

The primary checkout stays on clean `main`. The retained `stream-machine-demo` worktree is clean and has no commits absent from all remote refs. Its worker still depends on that directory. Owner: the user. Next step: approve a new worker source location before removing the checkout. This task changes no other worktree or live process.
