# Commit and share a change

Use this guide to finish a change without including unrelated work.

## Prepare the checkout

Create an issue, then create a worktree from current `origin/main`. Keep each task in its own worktree.

Keep the primary checkout on clean, current `main`. Make task edits in the issue's worktree. Before starting, name any existing edits and their owner.

Run these commands from the worktree:

```sh
mise install
mise run install
mise run hooks:install
```

The last command installs hk launchers through mise. If global hk launchers already exist, hk keeps them and uses this repository's `hk.pkl`.

## Commit one change

Read the `git-surgeon` skill before selecting hunks. The Git index holds the staged version of each file for the next commit. Inspect the working files and their staged versions:

```sh
git status --short --branch
git-surgeon hunks
git-surgeon show <hunk-id>
git-surgeon stage <hunk-id>
git diff --cached
```

Use `git-surgeon stage <hunk-id> --lines <start>-<end>` when one hunk contains separate changes. Stage new files with `git add <path>`.

Partial hunk commits are allowed during a task. Commit and push all completed task work before claiming completion.

Run the checks needed for the change, then commit:

```sh
mise run hooks:check
git commit -m "chore: describe the change (#issue)"
git status --short --branch
```

The pre-commit hook checks Markdown, staged whitespace, and staged secrets. It does not fix files, stage files, or stash edits. Markdown checks read current file contents, so inspect the staged diff when a file also has unstaged edits.

The Markdown config accepts existing table alignment and skill frontmatter spacing. It also preserves a bare URL in the historical verification report. Other Markdown rules still apply.

The commit-message hook runs Commitizen. A message such as `update stuff` fails. A message such as `fix: reject expired previews` passes.

## Check staged secrets

Run `mise run secrets:check` after staging the intended change. The check uses [Gitleaks](https://github.com/gitleaks/gitleaks) to scan complete staged file contents, not just added patch lines or unstaged working files. It rejects staged local secret files, including `fnox.local.toml`, even when someone force-adds an ignored file. It does not fix files or change the index.

Keep reference-only `fnox.toml` updates committable. Do not replace references with credential literals. See [secret setup and refresh](secrets.md) for the required age cache and global helper prerequisites.

A successful check reports no detected secrets, not proof that every password is absent. Default scanner rules have limits. Review the staged diff yourself without copying secrets into logs or chat.

If the check reports a finding, remove the credential from the staged content and rotate it if exposed. If verification cannot complete, fix the missing tool or reported prerequisite and rerun the check. Do not bypass the hook or enable verbose secret output. Use synthetic fixtures for scanner tests, never real credentials.

## Push a completed change

Push after a verified change and before handing off the task:

```sh
git push -u origin HEAD
git fetch origin --prune
mise run git:handoff
```

The pre-push hook runs TypeScript checks and domain tests. `git:handoff` passes only when the current worktree is clean and its branch matches its upstream.

If the handoff check fails, resolve the reported changes or commits, then run the check again. The check rejects detached HEAD, missing upstream refs, tracked edits, staged edits, untracked files, and commits ahead of or behind upstream.

The task reads local tracking refs. It does not fetch, contact the remote, or change the index, worktree, or refs. Run the fetch command first so those refs are current.

## Finish the handoff

Inspect other worktrees and running processes before the final reply:

```sh
git worktree list
```

For each retained worktree, inspect its status and local-only commits. Check ignored files and any processes or configured paths that use the worktree. `git:handoff` checks only the current worktree. It does not inspect ignored files.

Name each remaining dirty worktree, local-only commit, or running process. Give the owner, the reason it stays, and the next step. Link any cleanup record under `docs/reviews/`.

If a completion check fails, report the path and blocker. Do not claim completion until completed task work is committed and pushed.

## Generate a changelog

Preview the changelog before writing it:

```sh
mise run changelog:preview
mise run changelog
git diff -- docs/CHANGELOG.md
```

Commitizen reads conventional commits and writes `docs/CHANGELOG.md`. These tasks do not bump versions, create tags, or publish a release. Before a release, review the entries and commit the changelog. The version in `.cz.toml` starts at the existing package version, `0.2.0`.

## Remove merged work

Follow the cleanup checklist in [AGENTS.md](../AGENTS.md#clean-up-after-a-merge). Confirm the PR is merged, then inspect the branch and worktree before removing either. A merged PR alone does not prove that later commits or local files are safe to delete.

Compare the PR's merged head with the current branch tip. Preserve later or local-only commits on a pushed branch unless you verify that their changes reached `main`. Check the changes when a squash merge gives them different commit IDs.

Check running processes and configured source paths before removal. If a worker uses the worktree, keep it. Get the owner's approval before moving or stopping the worker. Verify its replacement before removing the old source directory.

For several worktrees, use the `safe-git-worktree-prune` skill. Remove one eligible worktree first and verify the result before continuing.

After merge, verify that the primary checkout is clean and has no active writer. Fast-forward its `main` branch to `origin/main`. Compare leftover edits with merged changes before preserving or removing them.

## Tool references

The commands follow the official [hk installation guide](https://hk.jdx.dev/cli/install.html), [hk hook configuration](https://hk.jdx.dev/configuration.html), [Commitizen message checks](https://commitizen-tools.github.io/commitizen/commands/check/), and [Commitizen changelog generation](https://commitizen-tools.github.io/commitizen/commands/changelog/).
