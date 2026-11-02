# Plugin Eval Report: plugin-builder

## At a Glance

- Score: 17/100
- Grade: F
- Risk: high
- Checks: 4 fail, 6 warn, 2 info
- Active budget: 2364 tokens (heavy)
- Observed usage: not supplied

## Why It Matters

- 4 failing error checks are driving the highest-confidence problems.
- 6 warning signals still need cleanup before this feels polished.
- manifest is the largest source of score loss at -28 points.
- Active budget pressure is high enough that token cost may dominate the user experience.
- No observed usage is attached yet, so budget conclusions are still based on static estimates.

## Fix First

- [fail/error] plugin.json interface is missing `capabilities`. Why: Manifest issues reduce trust because Codex may not discover or represent the plugin correctly. Fix: Add interface.capabilities to plugin.json.
- [fail/error] plugin.json interface is missing `defaultPrompt`. Why: Manifest issues reduce trust because Codex may not discover or represent the plugin correctly. Fix: Add interface.defaultPrompt to plugin.json.
- [fail/error] The skill contains relative links that do not resolve inside the skill directory. Why: Skill structure issues reduce trigger quality and make the skill harder to trust or maintain. Fix: Fix or remove broken links in SKILL.md.

## Recommended Next Step

- Fix structural issues first
- Why: Failing manifest or skill structure issues reduce trust and can invalidate later measurements.
- Chat request: "What should I fix first?"
- Local command: `plugin-eval start ~/src/openai-plugins-pr239/plugins/plugin-builder --request 'What should I fix first?' --format markdown`

## Details

<details>
<summary>Watch next</summary>

- [fail/error] deferred_cost_tokens is excessive relative to the current Codex baseline. Why: Budget pressure matters because always-loaded or frequently-loaded text can make the workflow feel expensive fast. Fix: Reduce repeated instruction text and move detail into deferred supporting files.
- [warn/warning] invoke_cost_tokens is heavy relative to the current Codex baseline. Why: Budget pressure matters because always-loaded or frequently-loaded text can make the workflow feel expensive fast. Fix: Reduce repeated instruction text and move detail into deferred supporting files.
- [warn/warning] Python source files were found without matching test files. Why: Best-practice gaps usually do not break the workflow immediately, but they make the skill harder to understand and improve. Fix: Add `test_*.py` or `tests/` coverage for the main Python logic.

</details>
<details>
<summary>Improvement brief</summary>

- Raise the evaluation from grade F (17/100) with a focus on the highest-signal structural and budget issues first.
- Goal: Add interface.capabilities to plugin.json.
- Goal: Add interface.defaultPrompt to plugin.json.
- Goal: Fix or remove broken links in SKILL.md.
- Goal: Reduce repeated instruction text and move detail into deferred supporting files.
- Measure: token-usage-observer
- Measure: task-outcome-scorecard
- Measure: tool-call-audit
- Measure: latency-efficiency
- Suggested prompt: Use the skill-creator guidance to improve plugin-builder. Keep the structure compact and move bulky details into references or scripts. Define success measures with these toolsets: token-usage-observer, task-outcome-scorecard, tool-call-audit, latency-efficiency. Address interface-missing-capabilities: plugin.json interface is missing `capabilities`. Address interface-missing-defaultPrompt: plugin.json interface is missing `defaultPrompt`. Address skill:plugin-creator:broken-relative-links: The skill contains relative links that do not resolve inside the skill directory. Address deferred_cost_tokens-budget-high: deferred_cost_tokens is excessive relative to the current Codex baseline. Address invoke_cost_tokens-budget-high: invoke_cost_tokens is heavy relative to the current Codex baseline. Address ts-complexity-high: At least one TypeScript function has high cyclomatic complexity. Address ts-long-lines: Some TypeScript lines exceed 120 characters. Address ts-tests-missing: TypeScript source files were found without matching test files.

</details>
<details>
<summary>Budgets and observed usage</summary>

- trigger_cost_tokens: 136 (moderate)
- invoke_cost_tokens: 2228 (heavy)
- deferred_cost_tokens: 38298 (excessive)
- explicit_only_invoke_cost_tokens: 0 (good, unscored)
- total_tokens: 40662 (excessive)

- No observed usage supplied.

</details>
<details>
<summary>Measurement plan</summary>

Combine cost, outcome, and trust signals so you can tell whether the skill or plugin is genuinely helping instead of only looking well-structured on paper.

- Token Usage Observer [high] Measure how many tokens the skill or plugin actually burns in representative runs. Signals: observed_usage_sample_count, observed_input_tokens_avg, observed_total_tokens_avg, estimate_vs_observed_input_ratio. Evidence: Responses API usage logs, Codex-like session exports, JSONL traces captured from local benchmarking harnesses.
- Task Outcome Scorecard [high] Measure whether the skill helps users finish the intended job with fewer retries and less cleanup. Signals: task_success_rate, first_pass_success_rate, retry_rate, human_override_rate. Evidence: Task run logs, Structured user acceptance checklist, Before/after comparison runs on the same prompts.
- Tool Call Audit [high] Check whether the agent uses the right tools, arguments, and sequencing when the skill is active. Signals: tool_call_success_rate, invalid_tool_argument_rate, recoverable_tool_failure_rate. Evidence: Tool invocation traces, Recorded sessions, Golden-path scenario replays.
- Latency And Efficiency [high] Track whether the skill speeds users up enough to justify its cost. Signals: p50_time_to_first_acceptable_answer_seconds, p95_time_to_task_completion_seconds, tokens_per_successful_run. Evidence: Benchmark harness timings, Manual stopwatch runs on canonical tasks, Responses API timestamps combined with usage logs.
- Human Rubric Review [medium] Capture clarity, trust, and usefulness signals that automated checks will miss. Signals: clarity_score_avg, confidence_score_avg, follow_up_question_rate. Evidence: Reviewer scorecards, Team rubric sheets, Annotated transcripts.
- Regression Suite [medium] Protect the repository behavior that the skill is supposed to improve. Signals: test_pass_rate, lint_pass_rate, regression_escape_count. Evidence: Unit and integration test runs, Coverage deltas, Snapshot or golden-file checks.

</details>
<details>
<summary>Use From Codex Chat</summary>

Start with a natural chat request, then let plugin-eval show the exact local command sequence behind it.

Start with this chat request: "Evaluate this plugin."
Why this path: Plugin Eval recommended Evaluate Plugin from the current local state for this plugin.
Quick local entrypoint: plugin-eval start ~/src/openai-plugins-pr239/plugins/plugin-builder --request 'Evaluate this plugin.' --format markdown
Plugin Eval will run first: plugin-eval analyze ~/src/openai-plugins-pr239/plugins/plugin-builder --format markdown

Other chat requests you can use:

- Full Plugin Analysis: say "Give me a full analysis of this plugin, including benchmark setup." -> plugin-eval analyze ~/src/openai-plugins-pr239/plugins/plugin-builder --format markdown
- Evaluate Plugin: say "Evaluate this plugin." -> plugin-eval analyze ~/src/openai-plugins-pr239/plugins/plugin-builder --format markdown
- Explain Token Budget: say "Explain the token budget for this plugin." -> plugin-eval explain-budget ~/src/openai-plugins-pr239/plugins/plugin-builder --format markdown
- Measure Real Token Usage: say "Measure the real token usage of this plugin." -> plugin-eval init-benchmark ~/src/openai-plugins-pr239/plugins/plugin-builder
- Benchmark With Starter Scenarios: say "Help me benchmark this plugin." -> plugin-eval init-benchmark ~/src/openai-plugins-pr239/plugins/plugin-builder
- Start Here: say "What should I run next?" -> plugin-eval analyze ~/src/openai-plugins-pr239/plugins/plugin-builder --format markdown

</details>
<details>
<summary>Checks</summary>

- [FAIL] interface-missing-capabilities: plugin.json interface is missing `capabilities`. Evidence: /Users/prime/src/openai-plugins-pr239/plugins/plugin-builder/.codex-plugin/plugin.json Remediation: Add interface.capabilities to plugin.json.
- [FAIL] interface-missing-defaultPrompt: plugin.json interface is missing `defaultPrompt`. Evidence: /Users/prime/src/openai-plugins-pr239/plugins/plugin-builder/.codex-plugin/plugin.json Remediation: Add interface.defaultPrompt to plugin.json.
- [FAIL] skill:plugin-creator:broken-relative-links: The skill contains relative links that do not resolve inside the skill directory. Evidence: codex://plugins/<normalized plugin name>?marketplacePath=<absolute marketplace.json path> codex://plugins/<normalized plugin name>?marketplacePath=<absolute marketplace.json path>&mode=share Remediation: Fix or remove broken links in SKILL.md.
- [WARN] invoke_cost_tokens-budget-high: invoke_cost_tokens is heavy relative to the current Codex baseline. Evidence: Value: 2228 tokens Baseline samples: skills=0, plugins=0 Remediation: Reduce repeated instruction text and move detail into deferred supporting files.
- [FAIL] deferred_cost_tokens-budget-high: deferred_cost_tokens is excessive relative to the current Codex baseline. Evidence: Value: 38298 tokens Baseline samples: skills=0, plugins=0 Remediation: Reduce repeated instruction text and move detail into deferred supporting files.
- [WARN] ts-complexity-high: At least one TypeScript function has high cyclomatic complexity. Evidence: Max complexity: 107 Remediation: Split complex functions into smaller branches with clearer responsibilities.
- [WARN] ts-long-lines: Some TypeScript lines exceed 120 characters. Evidence: Long lines: 11 Remediation: Wrap long expressions and object literals to keep scanability high.
- [WARN] ts-tests-missing: TypeScript source files were found without matching test files. Evidence: Source files: 2 Remediation: Add `.test.ts` or `.spec.ts` coverage for the main TypeScript logic.
- [WARN] py-complexity-high: At least one Python function has high cyclomatic complexity. Evidence: Max complexity: 35 Remediation: Split complex functions into smaller helpers or guard clauses.
- [WARN] py-tests-missing: Python source files were found without matching test files. Evidence: Source files: 1 Remediation: Add `test_*.py` or `tests/` coverage for the main Python logic.
- [INFO] coverage-artifacts-unavailable: No coverage artifacts were found for this target. Evidence: plugins/plugin-builder Remediation: Generate `lcov.info`, `coverage.xml`, or an Istanbul coverage JSON file if you want coverage scoring.

</details>
<details>
<summary>Metrics</summary>

- skill:plugin-creator:skill_line_count: 180 lines (good)
- skill:plugin-creator:description_length_chars: 412 chars (good)
- skill:plugin-creator:relative_link_count: 2 links (good)
- skill:plugin-creator:code_fence_count: 7 blocks (good)
- skill:plugin-creator:support_file_count: 3 files (good)
- plugin_skill_count: 1 skills (good)
- plugin_keyword_count: 4 keywords (good)
- plugin_default_prompt_count: 0 prompts (moderate)
- trigger_cost_tokens: 136 tokens (moderate)
- invoke_cost_tokens: 2228 tokens (heavy)
- deferred_cost_tokens: 38298 tokens (excessive)
- explicit_only_invoke_cost_tokens: 0 tokens (good)
- ts_file_count: 2 files (good)
- ts_function_count: 0 functions (info)
- ts_max_cyclomatic_complexity: 107 score (heavy)
- ts_average_function_length: 0 lines (good)
- ts_max_nesting_depth: 0 levels (good)
- ts_comment_ratio: 0.004 ratio (moderate)
- ts_test_file_count: 0 files (moderate)
- py_file_count: 1 files (good)
- py_function_count: 0 functions (info)
- py_max_cyclomatic_complexity: 35 score (heavy)
- py_average_function_length: 0 lines (good)
- py_max_nesting_depth: 0 levels (good)
- py_comment_ratio: 0.004 ratio (moderate)
- py_test_file_count: 0 files (moderate)
- coverage_artifact_count: 0 files (info)

</details>
<details>
<summary>Score details</summary>

- Starting score: 100
- Total deductions: -83.25
- Final score: 17
- Risk: Contains 4 failing error checks (deferred_cost_tokens-budget-high, interface-missing-capabilities, interface-missing-defaultPrompt).
- Risk: Overall score is below 70, which the evaluator treats as high risk.

- -14 points: deferred_cost_tokens-budget-high [fail/error] deferred_cost_tokens is excessive relative to the current Codex baseline.
- -14 points: interface-missing-capabilities [fail/error] plugin.json interface is missing `capabilities`.
- -14 points: interface-missing-defaultPrompt [fail/error] plugin.json interface is missing `defaultPrompt`.
- -14 points: skill:plugin-creator:broken-relative-links [fail/error] The skill contains relative links that do not resolve inside the skill directory.
- -4.5 points: invoke_cost_tokens-budget-high [warn/warning] invoke_cost_tokens is heavy relative to the current Codex baseline.
- -4.5 points: py-complexity-high [warn/warning] At least one Python function has high cyclomatic complexity.
- -4.5 points: py-tests-missing [warn/warning] Python source files were found without matching test files.
- -4.5 points: ts-complexity-high [warn/warning] At least one TypeScript function has high cyclomatic complexity.
- -4.5 points: ts-long-lines [warn/warning] Some TypeScript lines exceed 120 characters.
- -4.5 points: ts-tests-missing [warn/warning] TypeScript source files were found without matching test files.
- -0.25 points: coverage-artifacts-unavailable [info/info] No coverage artifacts were found for this target.

- manifest: -28 points across 2 checks
- budget: -18.5 points across 2 checks
- skill-structure: -14 points across 1 check
- best-practice: -9 points across 2 checks
- complexity: -9 points across 2 checks
- readability: -4.5 points across 1 check
- coverage: -0.25 points across 1 check

</details>
