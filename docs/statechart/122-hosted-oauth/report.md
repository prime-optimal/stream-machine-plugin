# Hosted Twitch connection model

TLC exited 0. It reached 60 states and 106 steps. Eight invariants and the deadlock check hold. The chart draws ten visible states and 16 arrows. Twenty steps stay within a visible state and are omitted, including terminal self-loops. No invariant violations were found, so there are no bug paths to replay.

## What the model checks

The model separates a deployed Site, browser sign-in, and a verified Twitch connection. Initial states cover both a new deployment without a connection and an owner with a previously saved connection. Deployment alone supplies no provider evidence. A separate browser starts signed out even when an owner has a saved connection. Only the same signed-in owner can observe that connection.

Authorization requests the set union of the twelve baseline scopes, previously granted scopes, and additional scopes. Sets model deduplication; sorting affects URL presentation and is outside this model. Callback success requires owner-bound, live state, one-time consumption, provider validation, every requested scope, and encrypted persistence. Rejected or incomplete authorization preserves the previous connection and grants. Existing zero-scope connections need fresh authorization to acquire baseline scopes; reading status does not upgrade them.

Refresh may save only while the original connection remains present. Disconnect invalidates pending callback writes and refresh writes. These guards represent a bounded abstraction of the service and D1 conditions, not a proof of the database implementation.

The invariants mean:

- `EncryptedAtRest`: a stored connection has encrypted credentials.
- `OwnerBoundView`: the connected view belongs to the stored owner and follows provider validation.
- `DeploymentIsNotProviderProof`: deployment alone cannot establish a stored provider connection.
- `FreshBrowserHasNoIdentity`: opening another browser does not copy Sites identity.
- `ConsumedStateCannotReplay`: a callback entering exchange has consumed its state.
- `RequestPreservesScopes`: a pending request includes baseline, previous, and additional scopes exactly once as set members.
- `CompleteBeforeSave`: the validated callback has every requested grant before persistence.
- `FailedAuthorizationPreservesConnection`: rejected authorization keeps the prior saved connection and scope set.

## Source mapping

All source paths below are relative to `docs/hosted-oauth-site/`.

- `lib/twitch/runtime.ts:10` resolves the Sites principal; authenticated routes use `user.userId`, not a browser-supplied owner.
- `app/api/twitch/connect/route.ts:7` enforces origin and starts authorization with the signed-in owner.
- `lib/twitch/service.ts`, `begin`, requests the sorted union from `permissions.generated.json`, previous grants, and additional scopes, then saves ten-minute state.
- `lib/twitch/service.ts`, `complete`, checks cookie equality and atomically consumes owner-bound state before exchanging the code. It checks requested-grant completeness before encrypting and conditionally persisting tokens. A failed replacement never removes the previous row.
- `lib/twitch/service.ts`, `refresh`, claims a refresh lease; the D1 adapter conditionally replaces the row using that lease.
- `lib/twitch/store.ts` deletes pending states and the connection in one disconnect batch. Conditional `put` and `replaceRefreshed` prevent a later response from recreating the deleted connection.

The model assumes those guards work as specified. Source tests and actual D1 verification must establish that independently. No live Sites sign-in, Twitch consent, browser isolation, deployment, or secret configuration was verified by TLC.

## Checked chart

The generated Mermaid source is [chart.mmd](chart.mmd). It retains callback rejection, separate browser sign-in, refresh, and disconnect paths. Different hidden storage values can share the same visible label.

## Limits and regeneration

This finite model uses one stored owner and a second owner who can only request status. It represents all twelve baseline scopes explicitly and uses one symbolic previous scope and one symbolic additional scope. Initial previous connections need not contain baseline grants. Failed replacement authorization preserves stored existence and grants; token identity is abstracted. It omits detailed provider errors, expiry arithmetic, encryption algorithms, multiple pending state rows, lease expiration, overlapping refresh workers, and UI request ordering. It checks guards, not progress under network failure. No plugin integration is modeled.

The baseline reflects the scope comparison in PR #125 with merged PR #114. Ten baseline permissions describe future features. A successful grant does not prove those features work. The model checks the requested-scope contract, not Twitch consent or provider availability.

Run from the repository with a new output directory:

```sh
mise exec -- bun .agents/skills/statechart/scripts/statechart.ts docs/statechart/122-hosted-oauth/HostedOAuth.tla --config docs/statechart/122-hosted-oauth/HostedOAuth.cfg --view docs/statechart/122-hosted-oauth/view.mjs --out /private/tmp/oauth-122-model-new
```

The checked inputs are [HostedOAuth.tla](HostedOAuth.tla), [HostedOAuth.cfg](HostedOAuth.cfg), and [view.mjs](view.mjs). [tlc.out](tlc.out) records the successful check.
