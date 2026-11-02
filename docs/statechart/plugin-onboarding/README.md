# Contextual onboarding model

This model describes proposed connection setup. It does not verify the existing plugin or a real provider connection.

TLC checked 24 states and 77 steps. All five invariants and the deadlock check pass. The chart contains seven states and 12 arrows.

The model keeps the selected task through setup, failure, and cancellation. A successful authenticated read marks the current attempt ready. A failed read allows retry. Cancellation and connection loss clear readiness. A response from an old attempt cannot mark a canceled or newer attempt ready.

The model has two request tokens. A token cannot be reused until its outstanding response has arrived. Production code should use unique attempt identifiers rather than two reusable tokens. A lost response therefore limits this model's retry capacity until that response arrives. The model checks safety, not eventual completion.

The chart combines internal request bookkeeping into user-visible states. It omits 34 transitions that stay in the same displayed state, including ignored old results and waiting. No inter-state arrows are hidden.

The model excludes OAuth redirects, secret storage, permission scopes, multiple accounts, host capabilities, time-based freshness, crashes, persistence, and writes to OBS or Stream Deck. A timeout uses the failed-read transition. Connection loss includes revoked access. The only task label is clips; the same proposed setup contract can serve another task without modeling that task's business behavior.

The runner is a locally installed skill and is not bundled in a fresh worktree. The command below names the verified local runner path. On another machine, replace that path with the installed statechart runner. `tlc.txt` preserves the original `tlc.out` output.

Run from the project with Bun available through mise:

```sh
mise exec -- bun /Users/prime/Documents/ChatGPT/stream-machine-plugin/.agents/skills/statechart/scripts/statechart.ts docs/statechart/plugin-onboarding/Onboarding.tla --config docs/statechart/plugin-onboarding/Onboarding.cfg --view docs/statechart/plugin-onboarding/view.mjs --out /tmp/stream-machine-onboarding-check
```

The final check used the same command with an absolute skill-script path and `check-final` as the output directory. Exit code: 0. One intermediate edit failed because TLC evaluated a primed variable before its assignment. Reordering the conjunction fixed the model; the final result supersedes that failed run.
