# Repository workflow review

Issues [#58](https://github.com/prime-optimal/stream-machine-plugin/issues/58) and [#59](https://github.com/prime-optimal/stream-machine-plugin/issues/59) track these changes.

## Review findings

The review answered each question from `AGENTS.md`:

1. Code simplification. No product code changed. The hook config uses existing TypeScript and test tasks. Unneeded formatter and linter tools from the bootstrap were removed.
2. Documentation clarity. Project instructions require plain language, focused commits, verified pushes, and safe cleanup. [The Git workflow guide](../git-workflow.md) gives commands and expected results. Both writing skills are stored in the project.
3. Statechart need. No new chart or model update is needed. The change configures development checks and documents Git procedures. It changes no product states, transitions, or provider behavior.

## Verification

The isolated worktree started at `origin/main`, commit `1246d75`.

The following checks passed:

- `mise run hooks:install` confirmed existing global hk launchers. The project config supplies the checks.
- `mise run hooks:check` passed with no fixes or staging.
- `mise run check` passed.
- `mise run test` passed all 68 tests.
- The real hk commit-message hook rejected `update stuff` with exit code 14 and accepted a conventional commit with exit code 0.
- `mise run changelog:preview` printed unreleased entries. `mise run changelog` wrote `docs/CHANGELOG.md` without a version bump or tag.
- `git-surgeon` staged only lines 4 through 29 of the combined `AGENTS.md` hunk for the writing commit. After commit hooks ran, the separate 26-line Git workflow addition remained unstaged.

The bootstrap's Markdown defaults flagged existing table alignment, skill frontmatter spacing, and a historical bare URL. The config accepts those existing conventions instead of rewriting unrelated docs.

The existing vocabulary hook rejected an old commit title copied into the generated changelog. `.agents/vocabulary.yaml` excludes that generated file so regeneration preserves the original titles. Handwritten documentation still uses the word list.

## Preserved work

The original checkout remains on `codex/1-plugin-architecture` with its existing documentation edits and local agent files. This task does not commit that mixed tree or delete any existing branch or worktree. The cleanup policy requires checking each candidate for unique work and active use first.
