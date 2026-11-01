# Secret handling and RepoPrompt review

[Issue #70](https://github.com/prime-optimal/stream-machine-plugin/issues/70) tracks encrypted local caching, staged secret checks, and project workflow guidance.

## Secret handling

The project already had five 1Password references. Their names, values, and provider mappings remain unchanged. Provider-only bootstrap added `plain` for nonsecret literals and `sync-age` for local encryption. The private age identity remains outside the repository.

The project pins fnox 1.36.0, age 1.3.2, op 2.34.0, and Gitleaks 8.30.1. This avoids the observed mismatch between the bare shell's fnox 1.28.0 and mise's 1.36.0.

`mise run fnox-sync` completed successfully. The generated `fnox.local.toml` remains ignored and has mode `0600`. Each of the five entries retains its `onepass` source and adds a `sync` entry using `sync-age` ciphertext. No credential values were printed or committed.

Both the task worktree and primary checkout passed a presence-only check for all five values. The check used fnox with `--no-daemon --non-interactive` and put a failing `op` stub first on `PATH`. The stub was never invoked. This verifies that cached resolution worked without another 1Password call.

The primary checkout received only an ignored cache overlay, including the age provider needed until the tracked provider configuration is merged. Its tracked tree remains clean. No 1Password item or source credential changed.

The [fnox provider documentation](https://fnox.jdx.dev/providers/1password.html) describes source references. The [secret guide](../secrets.md) explains setup and intentional cache refresh. Caching requires the private identity and does not refresh rotated values automatically.

## Staged checks

`scripts/check-staged-secrets.ts` scans complete staged file versions through Gitleaks stdin. It does not inspect unstaged file contents or change the index. Local cache and credential paths are rejected before their blobs are read. Reference-only `fnox.toml` changes remain committable.

Scanner output is captured. The command emits only fixed pass, detected-secret, or incomplete-verification messages. Missing tools, unsupported index modes, and unresolved conflicts fail closed. Inherited scanner configuration and inline allow comments cannot disable the check.

The [Gitleaks documentation](https://github.com/gitleaks/gitleaks) describes the scanner. Default rules detect known secret patterns, not every possible password. Staged review remains required.

## RepoPrompt execution

RepoPrompt context-builder produced the implementation plan. The coordinator corrected two proposals before dispatch: ordinary reference updates must remain committable, and the user's later instruction made age caching required.

Two RepoPrompt children used the same explicitly bound task worktree with separate edit scopes. One implemented tooling and tests. The other reviewed the three requested workflow skills and their CLI counterparts, then wrote project guidance. A third child reviewed the scanner without editing it.

The first attempted child start failed before provider startup because the physical worktree was also loaded as an independently owned workspace folder. The coordinator inspected session state, confirmed no orphan child, removed that conflicting folder registration, and successfully bound subsequent children. No denied mutation was replayed.

The guide distinguishes direct implementation, plan-only design with promised user checkpoints, and delegated execution. It requires explicit worktree bindings, plan exports in child briefs, verification of child results, and cleanup of consumed exports. A narrow ignore exception makes `docs/plans/` trackable despite a workstation-wide `plans/` ignore rule.

## Verification

The following checks passed:

- All four pinned executable versions were checked through mise.
- `mise run secrets:check`, `mise run hooks:check`, and TypeScript checks exited successfully.
- All 80 tests passed, including 12 new scanner tests.
- Synthetic fixtures covered token detection, reference acceptance, mixed reference and secret content, both partial-staging directions, unchanged secret lines, renames, deleted files, unusual filenames, local caches, scanner failures, alternate indexes, and unsupported or unresolved entries.
- Fixture snapshots verified unchanged file and Git metadata bytes. Fixtures clear inherited Git variables and disable workstation Git config.
- Independent review exercised real hk with an excluded-only staged cache path. It rejected the path with exit code 2 and unchanged index and file hashes. That fixture used a local mise dispatcher. The actual project mise dispatch also passed the hook check.
- Both real encrypted cache presence checks passed with zero `op` invocations and no daemon.

## Review findings

The review answered each project question:

1. Code simplification. One small staged-file reader delegates detection to a pinned scanner. Default rules accept references without a custom allowlist.
2. Documentation clarity. Separate guides cover secret operations and RepoPrompt execution. Historical verification stays in this review rather than the procedures.
3. Statechart need. No application model update is needed. The changes configure external secret resolution and developer checks without changing product or worker transitions. The procedures describe initial sync, cached use, and explicit refresh.

The primary checkout and running integration worker remain intact. The worker's `stream-machine-demo` worktree stays because the process still uses its files. Its owner must arrange and approve a replacement before that checkout is removed.
