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

A successful check reports no detected secrets, not evidence that every password is absent. Default scanner rules have limits. Review the staged diff yourself without copying secrets into logs or chat.

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

## Finish the issue

Publish verification where issue readers can see it before the final handoff:

1. Write a new issue comment with completed work, the tested host and version when relevant, commands and results, PR or commit links, and limitations. Identify acceptance criteria that remain unmet.
2. For visual work, check screenshots for secrets and unrelated personal data. Attach the relevant images to the comment and give each a caption that explains what it proves. Documentation-only changes do not need a screenshot.
3. Use GitHub CLI attachment support or the GitHub comment composer. The installed CLI supports `--attach`. Replace the placeholders in this command with the issue number and real local paths:

```sh
gh issue comment <issue-number> \
	--repo prime-optimal/stream-machine-plugin \
	--body-file <comment-file> \
	--attach '<screenshot-path>#Caption describing the verified result'
```

GitHub CLI uploads the image and embeds it in the comment. If the body already references that local image, the CLI replaces the reference with its uploaded URL. Repeat `--attach` for additional images. See [GitHub's attachment instructions](https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli).

A report link, PR link, local file path, or bare screenshot-file link does not replace an image displayed in the comment. Link committed reports as supporting detail. If the installed tool cannot upload attachments, use a supported upload method or report the blocker. Do not move verification results into the issue description.

4. Open the published comment and confirm images display with useful captions and access for intended collaborators. Read back the text to verify results and limitations. Keep the original issue body for scope and acceptance criteria, updating only checklist items supported by verification.
5. Update the issue and its Board item. The current status options are `Todo`, `In Progress`, `Done`, and `Not planned`. Query the current field options before changing status. Keep required but unmerged work open and `In Progress`. Close and mark `Done` only after acceptance criteria are met and required changes are merged. A verification-only task with no merge requirement can finish once verified evidence is published.
6. Read back both the issue state and board status. Include the evidence-comment link and confirmed states in the final handoff. A successful push alone does not establish issue completion.

## Finish the handoff

Inspect other worktrees and running processes before the final reply:

```sh
git worktree list
```

For each retained worktree, inspect its status and local-only commits. Check ignored files and any processes or configured paths that use the worktree. `git:handoff` checks only the current worktree. It does not inspect ignored files.

Name each remaining dirty worktree, local-only commit, or running process. Give the owner, the reason it stays, and the next step. Link any cleanup record under `docs/reviews/`.

Complete [the issue evidence procedure](#finish-the-issue). Link the posted evidence comment and confirm the issue and board status. Report any missing attachment or publication blocker.

If a completion check fails, report the path and blocker. Do not claim completion until completed task work is committed and pushed.

## Generate a changelog

Preview the changelog before writing it:

```sh
mise run changelog:preview
mise run changelog
git diff -- docs/CHANGELOG.md
```

These manual tasks write a full-history changelog without bumping versions. Do not use them to replace the versioned release history after release automation starts.

### Build downloadable packages

The separate `package.yml` workflow builds ZIP and tar.gz packages for each main push, including release-PR merges, and for manual dispatch. It uses the exact event SHA, not the latest main at checkout time. Manual runs use the selected ref's event SHA. Builds retain the committed version, so different commits can share a version but have distinct artifact names.

This workflow has only `contents: read`. It does not prepare a release, write branches, tag, publish, or install the plugin. It does not depend on release-PR creation permissions. Download instructions are in [the setup guide](setup.md#download-a-ci-package). Released versions are also attached to [GitHub Releases](#publish-a-release).

### Prepare a release PR

`mise run release:preview` reports the next version without writing files. `mise run release:prepare` updates versions, release notes, and `.release-state.json` without committing or tagging.

The helper uses Commitizen 4.19.3 and commits after `releasedThrough`. The initial approved boundary is `1246d75`. Version sources are `.cz.toml`, `package.json`, `plugin.json`, and `src/version.ts`. Runtime metadata imports the shared version. Preparation records the source SHA, so repeated preparation and release-only merges do not bump again. Use conventional squash-merge titles.

The `Prepare release PR` workflow runs after pushes to `main` or a manual run on `main`. It runs checks before updating the fixed `automation/release` branch and PR. It rejects stale source and foreign branch provenance. Reserve that branch for automation. Do not edit it manually. A failed PR API call can leave a bot branch; a retry accepts only the expected bot identity, source marker, parent, and release paths.

The workflow uses `GITHUB_TOKEN` with job-scoped `contents: write` and `pull-requests: write`. Activation requires the repository's bundled **Allow GitHub Actions to create and approve pull requests** setting. Read-back during #105 returned `can_approve_pull_request_reviews: false`. This task does not change that setting. No code approves or automatically merges PRs.

Token-created PR checks can require manual approval, and token pushes do not start ordinary push workflows. The preparation workflow runs TypeScript, tests, stdio smoke, package, and check-only hooks itself. See [GitHub token event behavior](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow). Human review and merge remain required. This workflow does not tag or publish. The [publish workflow](#publish-a-release) does that after the merge.

See the [checked lifecycle and limits](statechart/105-release-automation/report.md).

### Publish a release

The `Publish release` workflow (`.github/workflows/release.yml`) creates the GitHub Release after a release PR merges. It runs on every push to `main` and on manual runs from `main`:

1. The `plan` job runs `mise run release:publish --dry-run`. The script reads the version from `plugin.json` and finds the commit that introduced it. It then checks whether release `v<version>` exists.
2. If that release is already published, the run stops. Ordinary merges therefore publish nothing until the next release PR changes the version.
3. Otherwise, the `publish` job checks out the release commit, not the pushed commit. It runs check, test, smoke, and package, then `mise run release:publish`. That creates tag `v<version>` at the release commit and a release with the version's `docs/CHANGELOG.md` section as notes. The `stream-machine-<version>.zip` and `.tar.gz` packages are attached.

Only the `publish` job has `contents: write`. Runs are serialized. The script refuses to publish when a draft release for the tag exists, when the tag points to another commit, when `HEAD` is not the release commit, when the worktree has changes, or when a package is missing. A failed upload can leave a draft release. Delete the draft, then rerun the workflow.

To check what would be published without writing anything, run:

```sh
mise run release:publish --dry-run
```

Expected result: JSON with the version, tag, release commit, current `HEAD`, whether the release is published, and the package paths and sizes. Publishing by hand requires a clean checkout of the release commit and `mise run package` first. Prefer a manual run of the workflow.

See the [checked publish lifecycle](statechart/120-release-publish/report.md).

## Remove merged work

Follow the cleanup checklist in [AGENTS.md](../AGENTS.md#clean-up-after-a-merge). Confirm the PR is merged, then inspect the branch and worktree before removing either. A merged PR alone does not prove that later commits or local files are safe to delete.

Compare the PR's merged head with the current branch tip. Preserve later or local-only commits on a pushed branch unless you verify that their changes reached `main`. Check the changes when a squash merge gives them different commit IDs.

Check running processes and configured source paths before removal. If a worker uses the worktree, keep it. Get the owner's approval before moving or stopping the worker. Verify its replacement before removing the old source directory.

For several worktrees, use the `safe-git-worktree-prune` skill. Remove one eligible worktree first and verify the result before continuing.

After merge, verify that the primary checkout is clean and has no active writer. Fast-forward its `main` branch to `origin/main`. Compare leftover edits with merged changes before preserving or removing them.

## Tool references

The commands follow the official [hk installation guide](https://hk.jdx.dev/cli/install.html), [hk hook configuration](https://hk.jdx.dev/configuration.html), [Commitizen message checks](https://commitizen-tools.github.io/commitizen/commands/check/), and [Commitizen changelog generation](https://commitizen-tools.github.io/commitizen/commands/changelog/).
