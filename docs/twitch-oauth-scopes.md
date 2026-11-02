# Local Twitch OAuth scopes

The desktop server does not expose these tools after #159. Their registrations are commented out in `src/server.ts`.

The local OAuth request includes these 12 baseline scopes, defined by `requiredTwitchScopes` in [the permission registry](../src/auth/permissions.ts):

```text
bits:read
channel:bot
channel:manage:broadcast
channel:manage:clips
channel:manage:redemptions
channel:read:redemptions
channel:read:subscriptions
clips:edit
moderator:read:followers
user:bot
user:read:chat
user:write:chat
```

Implemented privileged actions use `channel:manage:broadcast` for title updates and `channel:manage:clips` for own-channel clip downloads. The other ten scopes belong to `futureTwitchPermissions`. Requesting them does not establish that those features work or authorize a separate bot account.

The [permission audit](reviews/83-twitch-scope-audit.md#requested-product-policy) records the owner's broader consent policy and its conflict with Twitch's restriction on unused permissions.

## Request and reconnect behavior

`requestedTwitchScopes` unions the baseline with previously stored grants and additional scopes, removes duplicates, and sorts the result. Reconnect can therefore request more than the 12 baseline scopes. Legacy flags cannot narrow the baseline.

[`TwitchService.begin`](../src/auth/upstream/service.ts) reads stored grants and passes the result to [`TwitchClient.authorizationUrl`](../src/auth/upstream/client.ts). The client sends a space-separated `scope` parameter. Callback validation requires every requested scope before saving the replacement connection. Requested scopes are not proof of granted scopes.

## Hosted OAuth comparison

[PR #125 for issue #122](https://github.com/prime-optimal/stream-machine-plugin/pull/125) documents a separate hosted test that requests no optional Twitch scopes at reviewed commit `d1304c5aae908754d1a23599f4cbe022f1ca6a84`. The [scope comparison comment](https://github.com/prime-optimal/stream-machine-plugin/pull/125#issuecomment-6569024298) identifies changes needed for parity with local OAuth.

Matching the local request requires the baseline above, matching consent text, and callback checks for all requested grants. Existing zero-scope connections require fresh authorization to obtain added permissions. This reference does not change hosted OAuth or verify a hosted grant.
