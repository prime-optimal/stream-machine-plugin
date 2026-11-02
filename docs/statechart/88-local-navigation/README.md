# Local navigation and Twitch checks

This model checks the bounded [issue #88 UI slice](../../plans/88-local-navigation-findings.md). It does not claim full routing or Connections acceptance. The existing [Connections model](../primary-navigation/connections/README.md) remains the proposal for contextual setup and task return.

## Checked rules

TLC checked 190 distinct states and 869 steps with exit code 0. All seven invariants and the deadlock check passed. [The generated report](report.md) and [TLC output](tlc.txt) retain the result.

- `NavigationMakesNoCalls` requires menu selection to leave the explicit tool-call count unchanged.
- `DraftSurvives` requires the existing draft to survive every modeled transition.
- `ReadyRequiresCurrentAuthenticatedRead` requires a successful current authenticated status read and all 12 required grants before the model enters its fully verified state.
- `UrlDoesNotVerify` prevents a returned connection URL from establishing authentication or grants.
- `MissingScopesRemainHonest` keeps authenticated identity separate from complete grants. Missing future permissions do not erase the authenticated account.
- `StaleReadCannotVerify` rejects a status response from before reconnect.
- `TypeOK` keeps model values within their declared sets.

The fully verified state means account and grants verification only. It does not authorize a title write or prove a clip download. The model does not request a live grant, call a provider, or change a broadcast, worker, or USB owner.

## Chart

[The Mermaid chart](chart.mmd) shows six states and 13 arrows. The chart omits 696 steps that stay within one displayed state. These include navigation, stale-response rejection, repeated URL requests, and the bounded end state. No transition between different displayed states is hidden. No rule-breaking path was found, so there is no counterexample to replay against the implementation.

## Bounds and evidence limits

The model permits two explicit request revisions. A reconnect can invalidate one pending status read. A later response for that read cannot restore verification. Home and Connections have distinct menu values; Assets, Clips, Stream Deck, Tools, and Mock demo share `other` because their selection has the same no-call rule. One retained draft represents existing mounted view state.

The model abstracts a successful status envelope and required-scope completeness. It does not parse tool data, verify individual scope names, simulate HTTP, check browser links, prove focus or DOM retention, or implement callback transport. Runtime tests must cover those details. It does not prove provider-token validity, host compatibility, durable persistence, account switching, contextual return, or #93 completion. The scope list still comes from `src/auth/permissions.ts`; this model does not redefine consent policy.

The diagram describes the intended UI transitions. Compare it with the implementation tests before handoff. In particular, test a delayed status response followed by reconnect and confirm that the old response cannot restore a verified badge. Existing title approval remains separate from connection status.

## Reproduce

Run from the issue worktree. The runner belongs to the locally installed statechart skill in the primary checkout; this command reads that runner without changing the checkout. Replace its path if the skill lives elsewhere. Each run uses a new scratch directory.

```sh
	scratch=$(mktemp -d /tmp/stream-machine-88-statechart.XXXXXX)
	cp docs/statechart/88-local-navigation/LocalNavigation.tla "$scratch/"
	cp docs/statechart/88-local-navigation/LocalNavigation.cfg "$scratch/"
	cp docs/statechart/88-local-navigation/view.mjs "$scratch/"
	mise exec -- bun /Users/prime/Documents/ChatGPT/stream-machine-plugin/.agents/skills/statechart/scripts/statechart.ts \
		"$scratch/LocalNavigation.tla" --config "$scratch/LocalNavigation.cfg" \
		--view "$scratch/view.mjs" --out "$scratch/checked"
```

Expected result: all listed invariants and `NoDeadlock` hold, exit code 0, and `chart.mmd`, `report.md`, and `tlc.out` appear under the scratch output directory. The verified run used `/tmp/stream-machine-88-statechart/checked` on November 1, 2026. The initial sandboxed `mise exec -- bun --version` probe failed with exit code 1 and `Operation not permitted`; the approved runtime probe and statechart run both returned 0.
