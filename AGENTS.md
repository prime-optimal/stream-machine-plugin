# Work on Stream Machine

Use the private [stream-machine-plugin repository](https://github.com/prime-optimal/stream-machine-plugin) and the [Stream Machine project, #18](https://github.com/users/prime-optimal/projects/18). The project owner is `prime-optimal`.

Follow these development rules:

- Create an issue before implementation.
- Create branches from `main`.
- Use conventional commits.
- Apply `feat`, `fix`, or `chore`, one phase label, and one priority label. Phase labels are `phase:architecture`, `phase:build`, `phase:integration`, and `phase:release`. Priority labels are `priority:p0`, `priority:p1`, and `priority:p2`.
- Use the [implementation roadmap](docs/roadmap.md) for track ownership and completion dependencies. Start each implementation issue in its own worktree from `origin/main`.
- Build the smallest visible demo in the issue's Done when checklist. Extract shared helpers after working demos need them.
- Reuse TwitchCon's Twitch OAuth, the existing Sealos OpenDesign service, and OpenDesign's HyperFrames workflow before adding a replacement.
- Use mise for runtimes and tasks.
- Run `mise run install` to install dependencies.
- Use `mise run check` for TypeScript checks and `mise run test` for domain tests.
- Use `mise run smoke` to check the bundled server over stdio MCP.
- Use `mise run build` to build the server and UI.
- Use `mise run package` to create the plugin archive.
- Use Bun for JavaScript packages.
- Use uv for Python.
- Store source secrets in 1Password. Use fnox with the required encrypted local age cache. Follow [secret setup and refresh](docs/secrets.md). Never put credentials in source, logs, chat, command arguments, or `.env` files. Keep `fnox.local.toml` ignored and age private identities outside the repository.
- Preserve committable references in `fnox.toml`. Refresh cached credentials intentionally with `mise run fnox-sync` after setup, expiry, or rotation. Do not run init repeatedly or create 1Password items without authorization.
- Review staged content even when the secret scanner passes. Default rules cannot detect every password.
- Keep each source file under 500 lines.
- Write artifacts under `docs/`.
- Keep mock data clearly marked and separate from real provider actions. Claim a real account connection or action only after verifying it.
- Connect local MCP hosts directly to desktop providers when needed. Treat a cloud-to-desktop bridge as separate work.
- Do not start or stop broadcasts during architecture work.
- Do not modify active Stream Deck profiles during architecture work.
- Do not automatically start third-party automations during architecture work.
- Delegate work that requires extensive reading.
- Assign each agent a separate set of files to edit. Do not overwrite another agent's changes.

Use the repository layout to locate changes:

- Edit `src/server.ts` and `src/stdio.ts` for the MCP server.
- Edit `src/domain.ts`, `src/catalog.ts`, and `src/preview.ts` for domain behavior, mock data, and the local preview.
- Edit `src/ui/` for the native UI.
- Edit `skills/` for plugin skills and `plugin.json` for the manifest.
- Consult `docs/architecture.md` and `docs/decisions.md` for design decisions.

## Write for the reader

Every agent, including subagents, must apply [technical-writing](.agents/skills/technical-writing/SKILL.md) and [unslop](.agents/skills/unslop/SKILL.md) to project writing. Read both skills before writing or reviewing prose. This includes docs, README files, agent instructions, packaged skills, issues, PR descriptions, commit messages, and chat updates.

Follow these writing rules:

- Use plain words and complete sentences. Keep articles and verbs when they help the reader understand.
- Keep replies short, but explain technical terms before relying on them. Do not assume the reader knows the architecture.
- State what something does and why the reader needs it. Cut filler, metaphors, and repeated points.
- Give each document one purpose: tutorial, how-to, reference, or explanation. Split and link material with different purposes.
- Use real file, symbol, flag, and command names. Give procedures an expected result.
- Distinguish implemented behavior, mock behavior, proposals, and historical verification results.
- Keep headings in sentence case. Save artifacts under `docs/` and return a file link with a one-line description.

## Review each change

Every review must answer these questions:

1. Can this code be simplified without changing required behavior? Look for unnecessary branches, duplication, and abstractions.
2. Can this documentation be clarified? Apply both writing skills. Check terminology, examples, commands, and claims against the code.
3. Does this documentation need a statechart made with the `statechart` skill, or does an existing statechart need an update?

Use the statechart skill when a flow's states, transitions, failures, or rules need checking or explanation. Update the existing model and chart when a change affects that behavior. Follow the skill's model checks and reproduction requirements. Save the resulting documentation under `docs/statechart/`.

Record a finding or a brief reason why no change is needed for each question. Mark questions that do not apply. Keep review artifacts under `docs/reviews/` and link findings to files and lines.

## Commit and push completed work

Follow these rules throughout the task:

- Use the `git-surgeon` skill to inspect and stage hunks. Keep each commit focused on one change, even when changes share a file.
- Inspect the staged diff before committing. Stage new files by explicit path. Never stage the whole tree blindly.
- Check for other writers before staging or committing. Preserve unrelated edits and never commit another session's unfinished work.
- Commit each complete, verified change before starting unrelated work. Push completed commits before a handoff or the end of a task.
- Use conventional commit messages and reference the issue. Set upstream tracking on the first push, then verify the remote branch contains the commits.
- Check status after hooks run. Report any remaining edits and their owner or reason. Do not leave completed work uncommitted without explaining the blocker.
- Run `mise run hooks:install` in a new checkout. Keep automatic hooks check-only so they do not expand staged hunks.
- Run `mise run hooks:check` before handoff. Run checks and tests relevant to the change before committing.
- Use Commitizen through `mise run changelog:preview` and `mise run changelog`. Review and commit the generated `docs/CHANGELOG.md` when preparing a release. Do not create release tags or publish as part of routine commits.

## Clean up after a merge

After GitHub confirms the PR is merged, follow these steps:

1. Fetch the remote state. Confirm the merged PR contains the branch's current work. A squash merge may have a different commit ID.
2. Inspect the worktree for tracked edits, untracked files, and useful ignored files. Check for unpushed commits and another active session.
3. Preserve any unique work in a commit pushed to a named branch, or move local files to an agreed location. Keep dirty or active worktrees.
4. Remove the clean, inactive worktree with `git worktree remove <path>`. Delete the merged local and remote branches after checking for later commits or open PRs.
5. Run `git worktree prune`, then verify the remaining branches and worktrees. Report anything kept and why.

Use the `safe-git-worktree-prune` skill for batch cleanup. Test cleanup on one worktree before continuing. Never use forced removal, broad directory deletion, or `git clean` to bypass these checks. If a squash merge prevents ordinary branch deletion, verify the changes reached `main` before deleting the branch.
