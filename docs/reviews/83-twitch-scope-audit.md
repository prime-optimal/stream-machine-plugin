# Twitch permission reference for issue #83

November 1, 2026. The endpoint audit uses main at `bc43ca8d5973ac9057a912cef84f444ef17a1bdb`. The implementation uses the product policy below. No real consent, provider action, or token state was changed for this work.

## Requested product policy

The owner explicitly chose these 12 permissions for initial connection, including future capabilities:

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

Only `channel:manage:broadcast` and `channel:manage:clips` support implemented privileged actions. The other ten are requested product permissions, not implemented endpoint mappings.

[Twitch requires applications to request only scopes used by their APIs](https://dev.twitch.tv/docs/authentication/scopes/). Requesting these ten unused permissions conflicts with that policy and may risk API access suspension. The owner explicitly selected the broader list despite this conflict. This reference records that choice, not Twitch approval.

There is no wildcard `channel:manage` scope. Every scope above is an exact name. Initial policy excludes legacy IRC `chat:read` and `chat:edit`, developer analytics, email, stream keys, editor clip access, and unspecified permissions. Reconnect preserves previously stored grants even when outside the new policy.

## Prior behavior and historical evidence

These are separate facts, not one account-state claim:

- Fresh default `TwitchService.begin()` requested zero scopes.
- The live UI used `manageBroadcast: true` and requested title access only.
- Clip downloads required an explicit `manageClips` upgrade.
- The inherited optional follower flag could request `moderator:read:followers`, but the local route always passed false. It did not implement follower reads or events.
- The last actual token-grant evidence recorded for #39 was broadcast-only. That historical observation does not prove the current token's grants. This task did not inspect or mutate real tokens.

The old empty-default and opt-in tests described the prior contract. They do not constrain the owner-authorized policy change.

## Implemented endpoint inventory on main

All source references below refer to the audited HEAD.

| Call | Implemented use and evidence | Token and identity | Additional user scope |
| --- | --- | --- | --- |
| `GET /helix/users` | OAuth profile: `src/auth/upstream/client.ts:51-56`. Description, profile photo, and offline image: `src/adapters/twitch/client.ts:30-39`. | User token. No-ID request resolves token owner. Response ID must match expected connected account. | None. Email is not consumed. |
| `GET /helix/channels` | Current title/category and read-back: `src/adapters/twitch/client.ts:21-29`. | Code uses connected user's token and ID as `broadcaster_id`. | None. |
| `PATCH /helix/channels` | Exact approved title update: `src/adapters/twitch/client.ts:11-18,40`, `service.ts:34-54`. | Broadcaster user token. Requested broadcaster must equal token owner. | `channel:manage:broadcast`. |
| `GET /helix/clips?id=...` | Clip metadata: `src/adapters/twitch/clips-client.ts:19-29`. | Code uses connected user token. Metadata read can target another broadcaster's clip. | None. |
| `GET /helix/clips/downloads` | Official download URLs: `src/adapters/twitch/clips-client.ts:30-38`, `clips-service.ts:13-27`. | Code requires clip broadcaster equal connected user. Sets `broadcaster_id = editor_id = account.id`. | `channel:manage:clips`. |
| `POST /helix/eventsub/subscriptions` | Worker setup: `src/demo-worker.ts:9-20`. | User token because transport is WebSocket, not webhook. | Determined by event type below. |
| WebSocket `channel.update` v2 | Only implemented live event parser/subscription: `src/events/eventsub.ts:5-22,92-98,114-119`. | Connected account supplies broadcaster condition. Payload and condition IDs are checked against it. | None. |

[Helix reference](https://dev.twitch.tv/docs/api/reference/): Get Users, Get Channel Information, Modify Channel Information, Get Clips, Get Clips Download, and Create EventSub Subscription. [EventSub channel.update](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelupdate) has no event-specific authorization.

The clip API also documents `editor:manage:clips` as an alternative and app-token support. That does not describe this implementation. It rejects other broadcasters before requesting download URLs, so adding editor permission would not enable cross-channel downloads. `clips:edit` covers Create Clip, which is not called.

OAuth plumbing also calls `GET /oauth2/authorize`, `POST /oauth2/token` for code exchange and refresh, `GET /oauth2/validate`, and `POST /oauth2/revoke`. See `src/auth/upstream/client.ts:17-60`. These calls do not introduce a feature scope. No client-credentials path is implemented on main.

## Identity boundaries

The fixed `local-desktop-owner` is a storage key, not a Twitch role. The runtime supplies one validated Twitch user. Title updates require that user to be the broadcaster. Downloads set `editor_id` and `broadcaster_id` to that same user and reject other channels.

Broadcaster consent does not grant permissions for a separate bot account. A future app-token bot path requires the bot user's own authorization and the applicable channel authorization or moderator exception. Moderator or editor status is a role check, not a substitute for the required scope. WebSocket subscription creation needs a user token. Webhook and conduit creation use app tokens with prior user grants where required.

## PR #80 coverage, separate from merged main

Reviewed [PR #80](https://github.com/prime-optimal/stream-machine-plugin/pull/80) at the head above.

| PR code | Actual functionality | Initial streamer grant impact |
| --- | --- | --- |
| `src/adapters/igdb/twitch-games.ts:11-21,36-48` | Client-credentials app token from `POST /oauth2/token`, then `GET /helix/games?id=...`. | None. No user login. |
| `src/adapters/igdb/client.ts:13-19` | `POST https://api.igdb.com/v4/games` uses that app token. | None. [IGDB authentication](https://api-docs.igdb.com/#authentication) documents client credentials. |
| `src/adapters/media/contracts.ts:7-24`, `provider.ts:89-127` | Public YouTube metadata and transcript through private media provider. Not Twitch video ingestion. | None. |
| `src/analytics/broadcast-duration.ts:34-64`, `register.ts:6-9` | Calculates observed duration from a user-supplied report. No Twitch analytics fetch. | None. |

PR #80 does not justify `analytics:read:games`, `analytics:read:extensions`, video-management permissions, or any bot scopes. It neither replaces nor adds a scope to the merged clip path.

## Future capability matrix versus roadmap

These capabilities are not implemented. The owner now requests their listed product permissions in advance; no future endpoint is presented as active. The roadmap's automation demo requires one event, already implemented as channel update. It does not promise every alert type. `docs/roadmap.md:12-23,58-76` and `docs/roadmap-plan.json:39-47` are the relevant boundaries.

| Future capability | Required permission for a user-token path | Identity and roadmap status |
| --- | --- | --- |
| Read chat messages through `channel.chat.message` v1 | `user:read:chat` | Event condition user is the authorized reader. App-token delivery additionally needs reader `user:bot` and broadcaster `channel:bot` or reader moderator status. Not the implemented worker event. |
| Send ordinary unpinned chat via `POST /helix/chat/messages` | `user:write:chat` | `sender_id` equals token user. App-token bot grants are separate, as described above. No current roadmap demo implements a chat sender. |
| Follow alert, `channel.follow` v2 | `moderator:read:followers` | Authorized moderator or broadcaster for target channel, with matching `moderator_user_id`. One generic automation demo does not justify a second event implementation. |
| Subscription, gift, resub message, or subscription-end alert | `channel:read:subscriptions` | Grant belongs to target broadcaster. Events are `channel.subscribe`, `channel.subscription.gift`, `channel.subscription.message`, and `channel.subscription.end`. No current parser or subscription. |
| Cheer alert, `channel.cheer` v1 | `bits:read` | Target broadcaster's grant. Neither a generic OBS alert nor a channel update uses it. |
| Channel Points custom reward or redemption alert | `channel:read:redemptions` | Target broadcaster. Some custom-reward event contracts accept `channel:manage:redemptions` instead, but read permission is sufficient for observation. No reward management or event subscription is implemented. |
| Create a live clip, `POST /helix/clips` | `clips:edit` | Creating user is not necessarily broadcaster. Roadmap #39 implements download, not creation. The requested product list includes creation in advance. Creating a clip from a VOD has a separate management contract. |
| Download another broadcaster's clips as editor | `editor:manage:clips` | Editor must be authorized for target broadcaster, and `editor_id` matches editor token user. Current implementation rejects cross-channel clips and fixes editor ID to broadcaster ID. |
| Developer game or extension analytics | `analytics:read:games` or `analytics:read:extensions` | These read developer-owned game or extension analytics, not general streamer Creator Dashboard metrics. PR #80's metric consumes a report, not these APIs. |

Future WebSocket subscriptions use a user token with the event's required permission. Webhook and conduit creation use app tokens backed by the appropriate prior user grants. The initial product request does not collapse these distinct bot, moderator, and broadcaster identities.

Requirements above follow the [EventSub type reference](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/), [Send Chat Message](https://dev.twitch.tv/docs/api/reference/#send-chat-message), and [scope inventory](https://dev.twitch.tv/docs/authentication/scopes/). Token choice does not waive role or target-ID checks.

## Scope exclusions and secondary reference

Game and extension analytics scopes concern developer-owned game or extension data, not general Creator Dashboard metrics. PR #80's local interval calculation needs neither. Profile reads need neither `user:read:email` nor `channel:read:stream_key`. Permissions do not create missing profile-image upload, profile-header, or About-panel APIs.

[Chillymosh's generator](https://chillymosh.com/tools/twitch/twitch-scopes) maps the two implemented permissions to the expected API uses. It warns that its mapping is best-effort and assumes the bot is a moderator. Stream Machine has no separate bot identity, so official endpoint and identity requirements take precedence.

## Registry and observable contract

`src/auth/permissions.ts` separates `twitchFeatures`, which describes implemented tools, endpoints, events, and identities, from `futureTwitchPermissions`, which describes requested future consent. `requiredTwitchScopes` is the exact product policy. It does not claim all requested features work.

Authorization requests union required scopes with stored grants, then deduplicate and sort. Legacy flags remain accepted but cannot narrow the policy. Local connection metadata returns `requiredScopes`, `implementedScopes`, `futureScopes`, `grantedScopes`, `missingScopes`, `requestedScopes`, and `retainedScopes`. Its `grantSource: "stored"` identifies cached grants without making live provider calls. The old singular `requiredScope: "profile"` and flag-only `additionalScopes` metadata are removed.

Status validates or refreshes through the existing flow and reports actual validated grants. Missing policy scopes set `reconnectRequired` without deleting an otherwise usable connection. Requested scopes never count as granted. Callback validation must include every requested permission before replacement. Denied or incomplete upgrades keep the old connection. Replaced tokens are revoked only after successful storage.

Tests pin the exact policy, implemented feature inventory, registered tool names, real client endpoint paths, actual EventSub type, and real authorization URL query. A future tool or scope change requires an explicit inventory and consent test update. Mocked callbacks cover empty, partial, and full older grants, retained extra grants, denial, incomplete replacement, successful replacement, and permission loss after refresh.

## Review and model

- Simplification: one small registry and existing grant-union flow replace independent flag-driven consent. No general authorization framework or worker redesign.
- Writing: UI and onboarding distinguish broader management grants, future capability requests, retained grants, and actual permissions. No wildcard, fabricated profile scope, or live-connection claim.
- Statechart: [consent model](../statechart/83-twitch-consent/README.md) checks requested policy, honest missing grants, rejection preservation, and validated replacement. It abstracts scope classes and does not prove provider-policy compliance or source behavior.
- Builder fidelity: the raw builder's empty-baseline recommendation and extra user approval gate were superseded by coordinator verification and explicit owner direction. Endpoint inventory, grant-preservation facts, failure tests, and identity limits were retained here. Its unrelated worker hardening proposal remains outside #83.

Implementation evidence, actual command exits, UI evidence, PR, and remaining limits are recorded in [the verification report](../verification/83-twitch-consent.md).
