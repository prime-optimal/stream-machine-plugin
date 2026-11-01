# Markdown review results

The review applied technical-writing and unslop to Stream Machine's project Markdown on 2026-11-01. [Issue #5](https://github.com/prime-optimal/stream-machine-plugin/issues/5) tracks the work.

The review covered the README, project rules, documentation, and packaged skills. Installed skills under `.agents/`, their test fixtures, generated package copies, and plugin caches were outside the requested scope.

## Document purposes

Each document now has one primary purpose:

| Document | Mode | Change |
| --- | --- | --- |
| [README](../README.md) | Reference | Describes the prototype and links to task guides and explanations. |
| [Project rules](../AGENTS.md) | How-to | Uses direct instructions while preserving development and safety rules. |
| [Architecture](architecture.md) | Explanation | Explains responsibilities and separates implemented behavior from proposals. |
| [Decisions](decisions.md) | Reference | Records the initial decisions without implying current installation status. |
| [Integration choices](integrations.md) | Explanation | Explains recommendations and the limits of the earlier source review. |
| [Setup](setup.md) | How-to | Separates commands into tasks and states the visible result of each workflow. |
| [Verification](verification.md) | Reference | Identifies the tested commit and records the earlier results as historical evidence. |
| [State model](statechart/README.md) | Explanation | Explains the model's outcomes and exclusions. |
| [Model results](statechart/report.md) | Reference | Corrects generated prose while preserving the reported results. |
| [Onboarding skill](../skills/onboarding/SKILL.md) | How-to | Separates account setup, recipe preview, and optional provider guidance. |
| [Recipe skill](../skills/preview-recipe/SKILL.md) | How-to | Separates preview steps, errors, resets, and provider restrictions. |
| [Package reference](package-reference.md) | Reference | Holds tool and runtime facts moved out of the setup guide. |
| [Statechart reproduction](statechart/reproduce.md) | How-to | Holds the commands moved out of the model explanation. |

## Checks and preserved content

Local validation passed for document headings, code fences, local file links, heading links, and skill frontmatter. The Mermaid blocks match the pre-edit copies exactly. The TLA+ model, configuration, view, generated chart source, and SVG are unchanged.

The statechart report retains all model counts and rule names. Its prose now identifies the report as generated results with editorial changes. Regeneration restores the generator's wording.

The review preserved existing uncommitted diagrams and links. It changed no product code, runtime configuration, installed skill, or test fixture. Runtime tests were not rerun for these prose changes. The writing review left its changes unstaged and uploaded no plugin release. Issue #5 tracks the later commit and merge.

The documentation branch starts from the current `main` branch. It retains the NLPM configuration, vocabulary rules, development commands, repository layout, and skill examples added in PR #4. The prose uses the canonical term "demo."

The project Markdown inventory is reproducible from the repository root:

```sh
rg --files --hidden -g '*.md' -g '!.git' -g '!node_modules' -g '!artifacts' -g '!dist' -g '!docs/packages' -g '!.agents' -g '!.claude'
```

## Proposed unslop addition

The review replaced the heading "Later execution lanes" with "Later execution paths." This proposed addition belongs in unslop rule 26. The shared skill was not edited.

```diff
+ execution lane (execution path)
```
