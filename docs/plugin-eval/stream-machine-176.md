# Plugin Eval Report: stream-machine

## At a Glance

- Score: 54/100
- Grade: F
- Risk: high
- Checks: 2 fail, 4 warn, 2 info
- Active budget: 2408 tokens (heavy)
- Observed usage: not supplied

## Why It Matters

- 2 failing error checks are driving the highest-confidence problems.
- 4 warning signals still need cleanup before this feels polished.
- budget is the largest source of score loss at -18.5 points.
- Active budget pressure is high enough that token cost may dominate the user experience.
- No observed usage is attached yet, so budget conclusions are still based on static estimates.

## Fix First

- [fail/error] The skill contains relative links that do not resolve inside the skill directory. Why: Skill structure issues reduce trigger quality and make the skill harder to trust or maintain. Fix: Fix or remove broken links in SKILL.md.
- [fail/error] deferred_cost_tokens is excessive relative to the current Codex baseline. Why: Budget pressure matters because always-loaded or frequently-loaded text can make the workflow feel expensive fast. Fix: Reduce repeated instruction text and move detail into deferred supporting files.
- [warn/warning] invoke_cost_tokens is heavy relative to the current Codex baseline. Why: Budget pressure matters because always-loaded or frequently-loaded text can make the workflow feel expensive fast. Fix: Reduce repeated instruction text and move detail into deferred supporting files.

## Recommended Next Step

- Fix structural issues first
- Why: Failing manifest or skill structure issues reduce trust and can invalidate later measurements.
- Chat request: "What should I fix first?"
- Local command: `plugin-eval start /tmp/sm-pkg-176/stream-machine --request 'What should I fix first?' --format markdown`

## Details

<details>
<summary>Watch next</summary>

- [warn/warning] The description does not clearly advertise when the skill should trigger. Why: Best-practice gaps usually do not break the workflow immediately, but they make the skill harder to understand and improve. Fix: Rewrite the description to include a clear 'Use when ...' trigger sentence.
- [warn/warning] The description does not clearly advertise when the skill should trigger. Why: Best-practice gaps usually do not break the workflow immediately, but they make the skill harder to understand and improve. Fix: Rewrite the description to include a clear 'Use when ...' trigger sentence.
- [warn/warning] The description does not clearly advertise when the skill should trigger. Why: Best-practice gaps usually do not break the workflow immediately, but they make the skill harder to understand and improve. Fix: Rewrite the description to include a clear 'Use when ...' trigger sentence.

</details>
<details>
<summary>Improvement brief</summary>

- Raise the evaluation from grade F (54/100) with a focus on the highest-signal structural and budget issues first.
- Goal: Rewrite the description to include a clear 'Use when ...' trigger sentence.
- Goal: Fix or remove broken links in SKILL.md.
- Goal: Reduce repeated instruction text and move detail into deferred supporting files.
- Measure: token-usage-observer
- Measure: task-outcome-scorecard
- Measure: tool-call-audit
- Measure: latency-efficiency
- Suggested prompt: Use the skill-creator guidance to improve stream-machine. Keep the structure compact and move bulky details into references or scripts. Define success measures with these toolsets: token-usage-observer, task-outcome-scorecard, tool-call-audit, latency-efficiency. Address skill:self-update:broken-relative-links: The skill contains relative links that do not resolve inside the skill directory. Address deferred_cost_tokens-budget-high: deferred_cost_tokens is excessive relative to the current Codex baseline. Address skill:onboarding:description-trigger-weak: The description does not clearly advertise when the skill should trigger. Address skill:preview-recipe:description-trigger-weak: The description does not clearly advertise when the skill should trigger. Address skill:self-update:description-trigger-weak: The description does not clearly advertise when the skill should trigger. Address invoke_cost_tokens-budget-high: invoke_cost_tokens is heavy relative to the current Codex baseline.

</details>
<details>
<summary>Budgets and observed usage</summary>

- trigger_cost_tokens: 150 (moderate)
- invoke_cost_tokens: 2258 (heavy)
- deferred_cost_tokens: 14271 (excessive)
- explicit_only_invoke_cost_tokens: 0 (good, unscored)
- total_tokens: 16679 (excessive)

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

</details>
<details>
<summary>Use From Codex Chat</summary>

Start with a natural chat request, then let plugin-eval show the exact local command sequence behind it.

Start with this chat request: "Evaluate this plugin."
Why this path: Plugin Eval recommended Evaluate Plugin from the current local state for this plugin.
Quick local entrypoint: plugin-eval start /tmp/sm-pkg-176/stream-machine --request 'Evaluate this plugin.' --format markdown
Plugin Eval will run first: plugin-eval analyze /tmp/sm-pkg-176/stream-machine --format markdown

Other chat requests you can use:

- Full Plugin Analysis: say "Give me a full analysis of this plugin, including benchmark setup." -> plugin-eval analyze /tmp/sm-pkg-176/stream-machine --format markdown
- Evaluate Plugin: say "Evaluate this plugin." -> plugin-eval analyze /tmp/sm-pkg-176/stream-machine --format markdown
- Explain Token Budget: say "Explain the token budget for this plugin." -> plugin-eval explain-budget /tmp/sm-pkg-176/stream-machine --format markdown
- Measure Real Token Usage: say "Measure the real token usage of this plugin." -> plugin-eval init-benchmark /tmp/sm-pkg-176/stream-machine
- Benchmark With Starter Scenarios: say "Help me benchmark this plugin." -> plugin-eval init-benchmark /tmp/sm-pkg-176/stream-machine
- Start Here: say "What should I run next?" -> plugin-eval analyze /tmp/sm-pkg-176/stream-machine --format markdown

</details>
<details>
<summary>Checks</summary>

- [WARN] skill:onboarding:description-trigger-weak: The description does not clearly advertise when the skill should trigger. Evidence: Descriptions are the primary auto-load surface in Codex. Remediation: Rewrite the description to include a clear 'Use when ...' trigger sentence.
- [WARN] skill:preview-recipe:description-trigger-weak: The description does not clearly advertise when the skill should trigger. Evidence: Descriptions are the primary auto-load surface in Codex. Remediation: Rewrite the description to include a clear 'Use when ...' trigger sentence.
- [WARN] skill:self-update:description-trigger-weak: The description does not clearly advertise when the skill should trigger. Evidence: Descriptions are the primary auto-load surface in Codex. Remediation: Rewrite the description to include a clear 'Use when ...' trigger sentence.
- [FAIL] skill:self-update:broken-relative-links: The skill contains relative links that do not resolve inside the skill directory. Evidence: ../../docs/setup.md#install-on-desktop Remediation: Fix or remove broken links in SKILL.md.
- [WARN] invoke_cost_tokens-budget-high: invoke_cost_tokens is heavy relative to the current Codex baseline. Evidence: Value: 2258 tokens Baseline samples: skills=0, plugins=0 Remediation: Reduce repeated instruction text and move detail into deferred supporting files.
- [FAIL] deferred_cost_tokens-budget-high: deferred_cost_tokens is excessive relative to the current Codex baseline. Evidence: Value: 14271 tokens Baseline samples: skills=0, plugins=0 Remediation: Reduce repeated instruction text and move detail into deferred supporting files.
- [INFO] coverage-artifacts-unavailable: No coverage artifacts were found for this target. Evidence: ../../../../../../../tmp/sm-pkg-176/stream-machine Remediation: Generate `lcov.info`, `coverage.xml`, or an Istanbul coverage JSON file if you want coverage scoring.

</details>
<details>
<summary>Metrics</summary>

- skill:onboarding:skill_line_count: 44 lines (good)
- skill:onboarding:description_length_chars: 118 chars (good)
- skill:onboarding:relative_link_count: 0 links (good)
- skill:onboarding:code_fence_count: 0 blocks (good)
- skill:onboarding:support_file_count: 0 files (info)
- skill:preview-recipe:skill_line_count: 63 lines (good)
- skill:preview-recipe:description_length_chars: 194 chars (good)
- skill:preview-recipe:relative_link_count: 0 links (good)
- skill:preview-recipe:code_fence_count: 0 blocks (good)
- skill:preview-recipe:support_file_count: 0 files (info)
- skill:self-update:skill_line_count: 13 lines (good)
- skill:self-update:description_length_chars: 99 chars (good)
- skill:self-update:relative_link_count: 1 links (good)
- skill:self-update:code_fence_count: 0 blocks (good)
- skill:self-update:support_file_count: 0 files (info)
- plugin_skill_count: 3 skills (good)
- plugin_keyword_count: 4 keywords (good)
- plugin_default_prompt_count: 1 prompts (good)
- trigger_cost_tokens: 150 tokens (moderate)
- invoke_cost_tokens: 2258 tokens (heavy)
- deferred_cost_tokens: 14271 tokens (excessive)
- explicit_only_invoke_cost_tokens: 0 tokens (good)
- coverage_artifact_count: 0 files (info)

</details>
<details>
<summary>Score details</summary>

- Starting score: 100
- Total deductions: -46.25
- Final score: 54
- Risk: Contains 2 failing error checks (deferred_cost_tokens-budget-high, skill:self-update:broken-relative-links).
- Risk: Overall score is below 70, which the evaluator treats as high risk.

- -14 points: deferred_cost_tokens-budget-high [fail/error] deferred_cost_tokens is excessive relative to the current Codex baseline.
- -14 points: skill:self-update:broken-relative-links [fail/error] The skill contains relative links that do not resolve inside the skill directory.
- -4.5 points: invoke_cost_tokens-budget-high [warn/warning] invoke_cost_tokens is heavy relative to the current Codex baseline.
- -4.5 points: skill:onboarding:description-trigger-weak [warn/warning] The description does not clearly advertise when the skill should trigger.
- -4.5 points: skill:preview-recipe:description-trigger-weak [warn/warning] The description does not clearly advertise when the skill should trigger.
- -4.5 points: skill:self-update:description-trigger-weak [warn/warning] The description does not clearly advertise when the skill should trigger.
- -0.25 points: coverage-artifacts-unavailable [info/info] No coverage artifacts were found for this target.

- budget: -18.5 points across 2 checks
- skill-structure: -14 points across 1 check
- best-practice: -13.5 points across 3 checks
- coverage: -0.25 points across 1 check

</details>
