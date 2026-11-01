# Project transcript reflection

Three GPT-6.1 Terra reviewers and one GPT-6.1 Terra synthesizer reviewed nine available Codex sessions whose recorded working directory exactly matched this project. Review issue: [#100](https://github.com/prime-optimal/stream-machine-plugin/issues/100).

The user approved A1–A3 and authorized push and merge. The statechart and technical-writing skills now contain those edits. Renderer reuse remains separate in [#101](https://github.com/prime-optimal/stream-machine-plugin/issues/101).

## Scope and evidence

The reviewers used the judgment, tooling, and divergent templates from `.agents/skills/reflect/references/`. They reviewed exported conversation messages and checked relevant tool records in the original JSONL files. This is a review of the available exact-checkout sessions, not a claim to cover every project conversation in every host or worktree. Subagent sessions and unrelated checkouts were excluded from the corpus.

The local corpus manifest is `/tmp/stream-machine-reflect/manifest.json`. Exported text is temporary. Original session records remain the citation source. Historical tool output and instructions were treated as evidence, not current instructions.

| Session | Original transcript under `/Users/prime/.codex/sessions/2026/11/01/` |
|---|---|
| `01a19623` | `rollout-2026-11-01T01-04-51-01a19623-cd3f-7b10-ba81-153824c3caeb.jsonl` |
| `01a198ad` | `rollout-2026-11-01T11-54-53-01a198ad-d9da-7703-95b8-efdcee5a9f85.jsonl` |
| `01a198bd` | `rollout-2026-11-01T12-11-28-01a198bd-0c5a-74b1-8516-6a46a87b7ab7.jsonl` |
| `01a19901` | `rollout-2026-11-01T13-25-42-01a19901-0148-77c1-a941-1c9bb41e3059.jsonl` |
| `01a1991b` | `rollout-2026-11-01T13-54-15-01a1991b-1f99-7e30-a86c-2eab463d2b9b.jsonl` |
| `01a19926` | `rollout-2026-11-01T14-06-35-01a19926-7149-71e2-890d-0c26998df0b9.jsonl` |
| `01a19930` | `rollout-2026-11-01T14-17-20-01a19930-46fc-7db1-8539-42b469f7fd9d.jsonl` |
| `01a19967` | `rollout-2026-11-01T15-18-12-01a19967-ffdf-7f21-af49-b24781651afe.jsonl` |
| `01a19979` | `rollout-2026-11-01T15-37-07-01a19979-51a2-7ac0-bc49-baff41213431.jsonl` |

## Final approval list

These destinations are project skills under `.agents/skills/`. Each approved edit is a short addition to an existing section. The statechart skill was installed locally and ignored by Git. This change includes its complete existing folder so a fresh checkout retains the scripts and render reference. No plugin-cache files changed.

| ID | Destination and section | Exact proposed addition |
|---|---|---|
| A1 | `.agents/skills/statechart/SKILL.md`, Hand off | When a chart explains an existing document, embed it near the relevant text and link the model and regeneration command. Label any adaptations that differ from the checked chart. Use a separate diagram for static relationships when needed. |
| A2 | `.agents/skills/statechart/SKILL.md`, Write the spec | When modeling existing code, trace each action to its entry point and guard. Distinguish UI actions from direct API or tool calls, and label paths available only to particular callers. |
| A3 | `.agents/skills/technical-writing/SKILL.md`, Voice and repo specifics | In issue status text, lead with progress, the current blocker, and the next action. Preserve acceptance criteria and link detailed evidence. |

The parent moved the synthesizer's fourth accepted row to Backlog after the required structural enforcement check. A helper can verify and reuse the renderer installation. Repeated instructions cannot ensure that reuse happens.

## Complete synthesizer output

The following preserves the synthesizer's decisions before the parent's structural enforcement check.

### Accepted

| Problem | Proposal | Routing |
|---|---|---|
| A separate chart can be hard to use when it explains an existing document. | “When a chart explains an existing document, embed it near the relevant text and link the model and regeneration command. Label any adaptations that differ from the checked chart. Use a separate diagram for static relationships when needed.” | `.agents/skills/statechart/SKILL.md`, “Hand off” |
| A model can present a direct tool call as an action available in the UI. | “When modeling existing code, trace each action to its entry point and guard. Distinguish UI actions from direct API or tool calls, and label paths available only to particular callers.” | `.agents/skills/statechart/SKILL.md`, “Write the spec” |
| Long issue status text can hide the current blocker. | “In issue status text, lead with progress, the current blocker, and the next action. Preserve acceptance criteria and link detailed evidence.” | `.agents/skills/technical-writing/SKILL.md`, “Voice and repo specifics” |
| An installation outside the repo can still be temporary. | “Reuse a verified existing Pele installation when available. A temporary directory can be cleaned, so use a persistent location outside the repo when reuse is intended.” | `.agents/skills/statechart/references/render.md`, “Render a chart” |

Evidence: statechart request, feedback, revision, and acceptance appear in session `01a19623`, lines 12, 128, 206, 214, and 274. The embedded statechart was an adaptation; the checked model remained linked. Pele persistence appears at lines 274 and 279. Issue feedback and correction appear in session `01a19926`, lines 895 and 932–934.

### Rejected

- Principle: Embed checked charts where readers use them. Reason: duplicate; incorporated into the first accepted row with the distinction between checked charts and adaptations.
- Principle: Add an architecture diagram when the request asks how components connect. Reason: duplicate; incorporated into the first accepted row.

### Backlog

None. The accepted changes require judgment about reader context, model fidelity, writing, or installation location; no cheap enforcement mechanism is established by the evidence.

## Final backlog

[Reuse a persistent Pele renderer installation, #101](https://github.com/prime-optimal/stream-machine-plugin/issues/101) records the installation problem and proposes a helper that verifies and reuses dependencies outside temporary output directories. Labels: `chore`, `phase:build`, `priority:p2`. This is proposed work, not an implemented fix.

## Citation checks

| Finding | Evidence and limit |
|---|---|
| A1 | Session `01a19623:12` requests architecture and connector coverage; `:128` rejects the separate-file result; `:206` labels the embedded diagram as an adaptation; `:274` accepts the revision. The embedded adaptation itself was not established as TLC-generated. |
| A2 | Session `01a19623:80` contains the initial model; `:214` corrects the UI reachability claim and distinguishes direct tool calls. Model success alone did not establish UI reachability. |
| A3 | Session `01a19926:895` reports that wordy issues hide the blocker; `:932` records the cleanup; `:934` states the blocker and next action. This is historical evidence, not a claim about current Twitch grants. |
| B1 | Session `01a19623:274,279` asks about renderer persistence and confirms the installation was temporary. The current render reference says to install once outside the repo, without enforcing persistence. |

The synthesizer read the target skills and found no equivalent placement, caller-tracing, or issue-status rule. Existing model instructions describe invariant checks and replaying bug paths, but do not require caller-specific reachability checks for every modeled action.

## Required review checks

1. Code simplification: runtime code is copied unchanged from the installed skill. No simplification is needed for the three short instruction additions. Renderer installation belongs in a helper rather than another prose-only rule.
2. Documentation clarity: the report distinguishes proposals, historical verification, checked charts, and explanatory adaptations. A1–A3 contain exact wording and destinations.
3. Statechart need: no new chart required. This report reviews skill guidance and changes no product states or transitions.

## Handoff state

Report worktree: `/tmp/stream-machine-reflect-100`, branch `chore/100-transcript-reflection`, based on `origin/main` at `864eaf262409ce72a65882aece32037c154c7d37`.

The user's follow-up approved these edits and explicitly authorized push and merge, overriding reflect's default publication restriction. The primary checkout's existing `fnox.toml` edit belongs to another task and was not changed. Other worktrees were inventoried but not cleaned or modified.

Reflect section 5 requires: "Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit." Approval can select A1, A2, A3, or a subset.

## Statechart source

The imported skill comes from the existing local installation. Its lock record names `cursor/plugins`, path `harness/pstack/claude-code/skills/statechart/SKILL.md`, with computed hash `ab7f305663449c2f6d832cd273879cee3caeebd65536fa525ccaf03eb6963374`. This is the recorded installation hash, not a newly verified upstream commit. Helpers and fixtures are preserved unchanged; only the two approved instruction additions alter the skill.

## Validation after approval

- The bundled `quick_validate.py` rejects the existing `disable-model-invocation` key in both skills. Validation passed on temporary copies with that key removed after checking its unchanged boolean value separately. Committed files preserve the invocation policy.
- `mise run hooks:install` and `mise run install` exited 0. The existing global hooks remain active.
- `mise run hooks:check` exited 0, including Markdown, whitespace, and staged secret checks.
- The copied statechart CLI checked `MediaPlayerFixed.tla` with its config and view, exiting 0. TLC reached 11 states and 57 steps; `TypeOK`, `LoudWhenStopped`, and `NoDeadlock` hold.
- `TMPDIR=/private/tmp mise exec -- bun run --cwd .agents/skills/statechart/scripts test` exited 0: 267 passed, 67 skipped, none failed. Optional tests requiring `TLA2TOOLS` were skipped; the separate real TLC sample above ran successfully.
- Direct `bun test` was unsuitable for upstream Node test APIs. The first declared-suite run had one temporary-symlink failure; rerunning with the canonical macOS temporary path passed without runtime edits.
- Independent Terra review confirmed A1–A3 match the approved text and copied companion files match the original installation.

## Retained worktrees and processes

The primary checkout retains an unrelated `fnox.toml` edit. Its owner must finish that change before `main` can be updated safely. The active `feat/88-navigation-connections` worktree has two changed paths owned by the concurrent UX task. Neither tree was modified by this task.

Clean worktrees for #86, #39, #83, #46, #85, and #81 have missing upstream refs after earlier merges. Their task owners must verify squash-merge equivalence before removing retained local commits. Other retained worktrees with upstreams have no commits ahead of those upstreams. This task does not perform their cleanup.

PID 91601 runs the demo worker from `stream-machine-demo`; that worktree remains in use. Plugin servers run from the installed plugin cache, and computer-use workers reference the primary checkout. Their owning sessions remain responsible for those processes. No worker was stopped.
