# Secret checks and RepoPrompt guidance

Issue #70 uses worktree `/tmp/stream-machine-secrets`, branch `codex/70-secrets-repoprompt`. Keep the primary checkout and active worker unchanged.

## Evidence and corrections

The existing fnox configuration started with five 1Password references and one project provider. Preserve every reference and mapping. The direct shell runs fnox 1.28.0, while mise selects 1.36.0. Global fnox helpers already exist. The helper audit confirmed that init prompts, apikey creates live items, and sync requires an age provider available through merged config.

Context-builder generated the original implementation plan. The temporary export was consumed by the implementation agents and retained through review. These corrections define the final scope:

- Keep `fnox.toml` committable. Blocking all changes to it would prevent normal reference updates. Never expose credential values in output.
- Block staged local secret files and scan complete indexed file contents. Do not inspect unstaged secret material or print scanner matches.
- Use Gitleaks 8.30.1, whose installed CLI supports stdin and full redaction. Prefer default rules. Add narrow configuration only if tests prove a need.
- Pin fnox 1.36.0, age 1.3.2, and op 2.34.0. The user explicitly requires `fnox-sync` and an encrypted local cache. Add an age provider without changing the five source mappings, sync once, then prove resolution without calling 1Password.
- Review the planning skills as specifications. Do not start a separate deep-plan interview or plan-only workflow for this implementation.

## Work items

1. Secret tooling. Own `mise.toml`, `hk.pkl`, scanner code, scanner config if needed, and scanner tests. Finish when synthetic fixtures prove detection, redaction, ignored cache rejection, reference acceptance, partial-stage correctness, and unchanged index or files.
2. Project guidance. Own `AGENTS.md`, `README.md`, `docs/secrets.md`, `docs/repoprompt-workflow.md`, and `docs/git-workflow.md`. Describe fnox helpers, their prerequisites and effects, and the three RepoPrompt workflows. Require explicit bindings and scoped export-based child briefs.
3. Verification and review. Coordinator checks both items, runs hooks and tests, records the review under `docs/reviews/`, commits focused hunks, and pushes a PR. Remove consumed temporary exports only after their evidence is reflected in the review.

The first two items may run concurrently because their edit scopes do not overlap. The coordinator owns provider and local cache setup. Source credential values, 1Password items, provider connections, and live processes remain unchanged.

## Progress

- Secret tooling and fixture tests are implemented. Defaults accept reference-only configuration without an allowlist.
- Project guidance is implemented and under review.
- An age provider and encrypted caches are initialized. All five source mappings remain unchanged. Both task and primary checkout passed presence-only resolution with a failing `op` stub and no daemon. Neither check invoked `op`.
- Final checks and review findings are recorded in [the review](../reviews/70-secrets-repoprompt.md). Issue #70 records commit and PR status.
