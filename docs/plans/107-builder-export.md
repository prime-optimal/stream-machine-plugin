# Package automation builder export

This historical export predates implementation. [The audit](107-package-audit.md) contains the controlling corrections.

```text
## Final Prompt
<taskname="Package Archives CI"/>

<task>Read-only phase-one audit for issue #107 and overlapping #104. Prepare an evidence-backed implementation plan only; do not edit or implement until follow-up approval. Context baseline: clean `chore/107-package-on-merge` at `2592f2afca2af3c7fdaa85fe5aa519f81a902df2`; PR #106 merged at this SHA. Work only in primary `stream-machine-plugin` bound worktree; ignore other roots and secrets.</task>

<architecture> `scripts/package.ts` assembles `artifacts/package/stream-machine` then creates `docs/packages/stream-machine-<version>.tar.gz`; current archive inspection rejects unexpected paths, `node_modules`, `.env`, `.git/`, `.DS_Store`, and `._` AppleDouble files. `scripts/package-smoke.ts` validates manifests and launches extracted package over MCP stdio. `mise.toml` wires package task after build. `ci.yml` runs checks and package on PR/manual; `release-pr.yml` prepares release PR on main/manual and requests `contents:read` globally, escalating only its prepare job. Docs describe manual package workflow and package contents. Release #105 review/statechart document current lifecycle and limitations.</architecture>

<selected_context>
- `scripts/package.ts`: staging, manifest checks, tar.gz creation and strict entry validator; likely #104 edit surface.
- `scripts/package-smoke.ts`: package-level stdio validation.
- `mise.toml`: package task integration.
- `.github/workflows/ci.yml`, `.github/workflows/release-pr.yml`: CI and release constraints.
- `tests/release-plan.test.ts`: Bun fixture/test conventions; no package archive regression tests currently selected/exposed.
- `docs/package-reference.md`, `docs/setup.md`, `docs/git-workflow.md`: public package and release workflow descriptions requiring alignment.
- `docs/reviews/105-release-automation.md`, `docs/statechart/105-release-automation/report.md`: release automation evidence and boundaries.</selected_context>

<relationships>
- `mise run package` → build → `scripts/package.ts` → staged payload → tar.gz.
- Package smoke consumes staged package root; future archive smoke should validate the archive-produced payload too.
- `ci.yml` packages in PR/manual CI. `release-pr.yml` packages only after a release change and holds main/manual-triggered release lifecycle.
- Release workflow’s `contents:read` top-level permission is overridden by the prepare job’s `contents:write` and `pull-requests:write`; do not copy that broader permission model into package artifact workflow.
</relationships>

<findings>
- Preserve existing tar.gz artifact. Add a real ZIP archive built from the same staged payload, with equally strict validation.
- Issue overlap includes excluding Finder `.DS_Store` and AppleDouble metadata before copying into staging; add a failing regression first and retain archive validator checks.
- Add a packaging workflow for `main` push and manual dispatch. Package exact triggering/event commit SHA; grant only `contents:read`; upload both archives using version + SHA naming. Distinguish workflow artifact upload’s outer ZIP wrapper from the requested plugin ZIP.
- Treat release-PR integration carefully: do not widen release permissions or change its human-review/no-publish lifecycle. Identify how packaging after PR merge interacts with exact SHA and duplicate/manual runs.
- Existing selected docs and review evidence support tar.gz usage only. Search found no authoritative checked-in evidence for plugin host accepted archive formats. Mark ZIP host compatibility unverified; find primary reference/evidence before claiming acceptance.
- Existing #105 checked statechart concerns release PR preparation, not archive packaging. Reuse as lifecycle constraint; do not run full statechart design workflow absent need.
- Minimal tests: first a failing fixture proving metadata exclusion before staging; test tar.gz and ZIP carry same expected payload and each reject forbidden/unexpected entries; workflow/static checks confirm event SHA, read-only permission, both artifacts and deterministic names. Keep one-record-first test scope.
</findings>

<ambiguities>Host’s accepted plugin archive formats remain unverified from repository evidence. Clarify whether manual dispatch should package selected ref SHA or default-branch SHA, and whether workflow artifacts should be retained for both event types with identical naming; recommend exact event SHA and explicit `workflow_dispatch` ref semantics.</ambiguities>

<next_step>Produce short implementation plan with scope, workflow trigger/SHA model, archive/test changes, docs, and verification. Do not implement until user follow-up. Export plan under `docs/plans/` if the downstream planning workflow supports it.</next_step>

## Selection
- Files: 12 total (12 full)
- Total tokens: 13216 (Auto view)
- Token breakdown: full 13216
- Token accounting: stale from bound_tab_cache; refresh pending

### Files
### Selected Files
stream-machine-plugin/
├── .github/
│   └── workflows/
│       ├── ci.yml — 141 tokens (full)
│       └── release-pr.yml — 1,178 tokens (full)
├── docs/
│   ├── reviews/
│   │   └── 105-release-automation.md — 939 tokens (full)
│   ├── statechart/
│   │   └── 105-release-automation/
│   │       ├── Release.tla — 1,162 tokens (full)
│   │       └── report.md — 1,273 tokens (full)
│   ├── git-workflow.md — 2,856 tokens (full)
│   ├── package-reference.md — 916 tokens (full)
│   └── setup.md — 548 tokens (full)
├── scripts/
│   ├── package-smoke.ts — 576 tokens (full)
│   └── package.ts — 1,061 tokens (full)
├── tests/
│   └── release-plan.test.ts — 1,857 tokens (full)
└── mise.toml — 709 tokens (full)


---

## Generated Plan

## Chat Send ✅
- **Chat**: `107-package-merge-audit-8864BF` | **Mode**: plan

### Response
## 1. Summary

Targeted change for #107/#104: preserve tar.gz, add real plugin ZIP from identical staging, exclude Finder metadata before staging, then package exact event commit on main pushes/manual runs. Upload both archives under version-plus-SHA names. Leave release-PR permissions and human-review lifecycle unchanged. **Plan only; no implementation or verification performed.** Intended export: `docs/plans/107-package-archives-ci.md`; not written because session prohibits tools and filesystem writes.

## 2. Current-state analysis

Evidence from supplied files:

- `mise.toml`: package task depends on build, then invokes `bun run package`.
- `scripts/package.ts`: validates manifests/skills → recreates staging → copies payload → generates compatibility manifests/notices → creates tar.gz → inspects archive entry names.
- Copy filter excludes `docs/packages`, but does not exclude `.DS_Store` or AppleDouble files before staging. Archive inspection rejects these afterward.
- `scripts/package-smoke.ts`: accepts package-root argument, checks manifests, launches configured MCP stdio server, verifies 31 tools and selected calls. Reuse against **extracted archives**, not merely staging.
- `.github/workflows/ci.yml`: PR/manual checks include packaging; no main-push artifact retention.
- `.github/workflows/release-pr.yml`: main/manual release preparation; packaging occurs only when version changes. Its write permissions serve release-PR mutation, not artifact packaging.
- Package docs describe tar.gz only. `docs/setup.md` hardcodes 0.2.0; package reference hardcodes 0.3.0.
- #105 review/model constrain release preparation. They neither verify ZIP host support nor model archive delivery.

Assumptions requiring implementation-time validation: supplied baseline is authoritative; `package.json` task bindings and full existing package tests were not supplied. Confirm those bindings before editing; avoid duplicate test coverage.

## 3. Design

### Shared archive boundary

Add `scripts/package-archive.ts`, small function module imported by packaging and fixture tests. No service, persistent state, or runtime application changes.

Responsibilities:

- Copy filter: retain existing `docs/packages` exclusion; additionally reject basename exactly `.DS_Store` or beginning `._`, at every directory depth.
- Recursive staging helper: apply that filter during copy. Tests exercise this same helper, proving metadata never reaches staging.
- Archive entry validator: shared by tar.gz and ZIP inspection. Retain existing forbidden-content checks; additionally reject absolute paths, backslashes, `.`/`..` components, duplicate entries, and entries outside `stream-machine/`.
- Expected-entry comparison: enumerate staged payload once; both archive listings must match its complete relative file/directory set. Normalize trailing directory separators consistently.
- Reject symlinks/nonregular entries during staging enumeration. Current intended payload is regular files/directories; rejection prevents archive-format-dependent link handling.

All operations remain sequential asynchronous filesystem/subprocess work in Bun. Command failures and validation mismatches throw; package task exits nonzero.

### Package construction

Modify `scripts/package.ts` without changing manifest generation, notices, staging location, or tar.gz filename.

After staging finishes:

1. Enumerate expected payload.
2. Remove previous outputs for current version.
3. Create existing tar.gz.
4. Create `docs/packages/stream-machine-<version>.zip` using system `zip`, from same parent directory and same `stream-machine` root.
5. List tar.gz with `tar`; list ZIP with `unzip`.
6. Validate each listing against shared rules and expected payload.
7. Report success only after both pass. On failure, remove both current-version outputs; preserve diagnostic staging.

Require `tar`, `zip`, and `unzip`; missing executable fails clearly. No new application dependency or Python helper.

Archive names remain version-only locally. Workflow creates SHA-qualified delivery copies. This preserves current tar.gz consumers.

### Main/manual artifact workflow

Add `.github/workflows/package.yml`:

- Events: `push` to `main`; `workflow_dispatch`, no custom inputs.
- Permissions: workflow-level `contents: read`; no job escalation.
- Checkout: existing pinned checkout action, explicit `ref: github.sha`, `persist-credentials: false`.
- Manual semantics: package selected dispatch ref’s event SHA, **not** current default-branch HEAD.
- Verify checked-out `HEAD` equals `GITHUB_SHA`.
- Use existing pinned mise action; run install, check, test, smoke, package.
- Extract each validated archive into separate fresh temporary directories; run existing package smoke against each extracted root.
- Only after both smokes pass, copy archives into dedicated temporary upload directory:

  - `stream-machine-<version>-<full-sha>.tar.gz`
  - `stream-machine-<version>-<full-sha>.zip`

- Upload that directory using pinned `actions/upload-artifact` v4; `if-no-files-found: error`, `retention-days: 30`, `overwrite: true`.
- Artifact name: `stream-machine-<version>-<full-sha>` for both event types.

Separate runs retain separate artifacts despite identical names. Reruns replace same-run artifact. No cancellation grouping: every triggering SHA gets independent execution. Failed checks/extraction/smoke prevent upload.

GitHub artifact download ZIP is an outer transport wrapper; requested plugin ZIP remains an explicit contained file. No tags, Releases, deployment, repository mutation, or host installation.

Release-PR merge naturally triggers packaging at **merge SHA**. Manual repeats are intentional; no deduplication or release-workflow dependency.

### Tests and documentation

Add fixture tests before implementation:

- Single payload containing legitimate file, nested `.DS_Store`, and nested `._*`: staging contains legitimate file only.
- Both archives extract into separate directories with identical expected paths and file bytes.
- Shared validator rejects forbidden metadata, secret/dependency/VCS paths, traversal, unexpected roots, missing entries, duplicates, and unexpected extra entries.
- Missing archiver/subprocess failure produces nonzero failure and no successful output pair.

Add workflow-contract tests following repository’s existing workflow-test conventions: main/manual triggers, event SHA checkout, read-only permissions, both extracted smokes, both SHA-qualified filenames, upload failure policy.

Docs distinguish local version-only names, CI version/SHA names, outer wrapper, retention, dispatch semantics, and unverified ZIP host compatibility. No claim that package smoke proves native-host installation.

## 4. File-by-file impact

| File | Change / dependency |
|---|---|
| `scripts/package-archive.ts` | Add shared staging filter/helper, staged inventory, archive validation. |
| `scripts/package.ts` | Reuse helper; produce/validate both formats; cleanup failed output pair. Depends on helper. |
| `tests/package-archive.test.ts` | Add metadata regression, parity, rejection, and failure fixtures. |
| `.github/workflows/package.yml` | Add exact-SHA packaging, extracted smokes, read-only artifact upload. Depends on dual archives. |
| `tests/package-workflow.test.ts` | Assert workflow contracts. Depends on workflow. |
| `docs/setup.md` | Replace stale fixed filename; document both local outputs and required archive tools. |
| `docs/package-reference.md` | Document formats, CI artifacts, retention, metadata exclusion, host-support limitation. |
| `docs/git-workflow.md` | Explain merge/manual packaging separately from release preparation. |

No planned changes: `mise.toml`, existing workflows, package-smoke interface, release state, #105 historical evidence/model.

## 5. Implementation order

1. After approval, verify bound worktree/baseline and #107/#104 scope; inspect package bindings and existing test conventions.
2. Add single metadata fixture regression; record expected failure before production changes.
3. Add shared helper and integrate dual archives atomically; pass metadata, parity, and rejection tests.
4. Add workflow and workflow-contract tests atomically.
5. Update three docs.
6. Run install, check, full tests, smoke, package, both extracted smokes, actionlint, and check-only hooks.
7. After merge, verify real main-push artifact: download wrapper, inspect both archives, confirm full SHA names and extracted payload. Repeat manual dispatch on selected ref; confirm event SHA behavior. Keep ZIP host acceptance explicitly unverified until primary host documentation or controlled installation evidence exists.


> 💡 Continue this plan conversation with ask_oracle(chat_id: "107-package-merge-audit-8864BF", new_chat: false). In Agent Mode, continuation requires the run that created this chat; after that run changes, start a new chat instead.
```
