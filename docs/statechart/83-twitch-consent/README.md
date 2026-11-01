# Twitch product consent model

This model checks the requested product-consent policy for issue #83. [The generated report](report.md) records the TLC result. [The chart](chart.mmd) shows the flow. [Reproduction](reproduce.md) runs the checks without OAuth or real credentials.

The requested initial policy contains 12 exact scopes. Only the first two support currently implemented endpoints. Consent for the remaining ten does not implement their features or prove Twitch will accept the request.

## Permission classes

`Implemented` represents the two permissions used by current title and clip-download endpoints:

- `channel:manage:broadcast`
- `channel:manage:clips`

`Future` represents the ten other permissions in the requested product policy:

- `user:read:chat`
- `user:write:chat`
- `moderator:read:followers`
- `channel:read:subscriptions`
- `bits:read`
- `channel:read:redemptions`
- `channel:manage:redemptions`
- `clips:edit`
- `user:bot`
- `channel:bot`

`Retained` represents one previously granted permission outside that policy. Each initial state is either disconnected or has a usable stored connection with any subset of the three abstract classes. Each class is all-or-none in this bounded model. The implementation tests must check the exact 12 names and individual missing permissions.

The grant belongs to the account that consents. Broadcaster consent does not authorize a distinct bot account. This model does not combine broadcaster, moderator, and bot identities or assert those roles exist.

## Checked rules

| Rule | Required behavior |
| --- | --- |
| `HonestMissing` | Missing permission classes equal the requested policy minus validated stored grants. Requested permissions never count as granted. |
| `RequestMatchesPolicy` | Every authorization request contains both requested policy classes and every stored prior grant. It adds no other class. |
| `RejectedKeepsConnection` | Denied consent and an incomplete grant keep the previous connection and its grants unchanged. |
| `ValidatedBeforeReady` | A successful replacement has a connected account, every requested validated permission class, and no missing policy class. |
| `ScopeLossKeepsConnection` | Validation can remove permission classes without deleting a usable connection. |
| `TypeOK` | States and grant classes stay within the finite model. |
| `NoDeadlock` | Every reachable state has an allowed next step. Terminal outcomes retain their current state. |

The model has no failed rules, so there is no counterexample to replay. The implementation tests must still verify actual authorization URLs, callback failures, retained grants, and missing-permission status. Model checking does not prove source behavior or provider-policy compliance.

## Chart abstraction

The chart combines pending requests into one state. Failure arrows name the prior connection state so the retained outcome remains explicit. The chart hides 77 steps that stay within the same visible label, including terminal self-loops and status checks that do not change visible readiness. No model action is otherwise hidden. The connected product-permissions label means the requested scopes were validated, not that future functionality works.

## Limits

The finite model checks one consent attempt or one status validation for each initial connection. All abstract policy-class subsets and one retained class are explored. A partial connection is an initial case for reconnect, so reconnection does not require a preceding status call in the model.

The model omits individual permissions within a class, token values, encryption, refresh leases, browser state cookies, account identity checks, network failures, concurrent callbacks, and provider side effects. An incomplete provider result is abstracted as rejection rather than storing its returned permission set. The source callback must validate that condition before it reaches the modeled rejection. No worker, broadcast, title update, clip download, chat, reward action, or bot runs in this model.
