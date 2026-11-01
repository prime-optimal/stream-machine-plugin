# Twitch profile and channel tools

This reference records issue [#53](https://github.com/prime-optimal/stream-machine-plugin/issues/53). It describes the source checkout, not an installed plugin update.

## Stream Machine tools

| Tool suffix after `stream_machine_twitch_` | Behavior |
| --- | --- |
| `status` | Validates the connected account and returns its scopes. |
| `connect` | Starts the existing local OAuth flow. |
| `channel` | Reads the current title and category. |
| `profile` | Reads the connected account description, photo URL, and offline image URL. |
| `preview_title` | Previews an exact title change without writing. |
| `apply_title` | Applies a browser-approved title preview and reads back the result. |

The new profile tool accepts only `{}`. It returns `mode: "live"`, `source: "https://api.twitch.tv/helix/users"`, and `profile`. The profile contains `broadcasterId`, `login`, `displayName`, `description`, `profilePictureUrl`, and `offlinePlaceholderUrl`.

Empty descriptions remain empty strings. Empty image strings become `null`. Nonempty images must be HTTPS URLs. Missing fields, malformed data, and invalid images return `TWITCH_INVALID_RESPONSE`. A different returned account produces `TWITCH_WRONG_ACCOUNT`. Email and deprecated view counts are excluded.

HTTP 401 returns `TWITCH_RECONNECT_REQUIRED`. HTTP 403 returns `TWITCH_SCOPE_REQUIRED`. HTTP 429 returns `TWITCH_RATE_LIMITED`. Other unsuccessful reads and network failures return `TWITCH_UNAVAILABLE`. Account errors retain their existing codes. No error response includes provider bodies or credentials. The adapter performs no automatic retry.

## Branding recipe

Use `profile` to gather current branding for a channel makeover brief. Use `channel` for the current stream title and category. Treat returned images and description as source material for proposed artwork and copy.

This slice gathers source material. It does not register a new makeover recipe or apply branding changes.

## Twitch API coverage

| Setting | Read | Later update |
| --- | --- | --- |
| Description | Get Users | Update User, with `user:edit`. |
| Profile photo | Get Users URL | No documented Helix upload endpoint. |
| Offline player image | Get Users URL | No documented Helix upload endpoint. |
| Profile header | No documented Helix field | No documented Helix upload endpoint. |
| Public active panel, overlay, and component extensions | Get User Active Extensions, without extra scope | Update User Extensions, with `user:edit:broadcast`. |
| Installed extension list | Get User Extensions, with `user:read:broadcast` or `user:edit:broadcast`. Inactive entries require the latter. | Activation uses Update User Extensions. |
| Custom About panels | No documented Helix endpoint | No documented Helix endpoint. |

The offline player image is distinct from the profile header. Extension slots are distinct from custom About panels. Development extensions need an additional broadcast scope for visibility. These findings follow the documented [Get Users](https://dev.twitch.tv/docs/api/reference/#get-users), [Update User](https://dev.twitch.tv/docs/api/reference/#update-user), and [extension endpoints](https://dev.twitch.tv/docs/api/reference/#get-user-active-extensions), checked November 1, 2026. Missing endpoint claims describe this API inventory.

Only the profile read is added here. Extension reads and description writes remain follow-up work. The current connection needs no additional permission for the profile read.

## Upstream MCP review

The inspected [twitch-mcp-server definitions](https://github.com/prime-optimal/twitch-mcp-server/blob/d8896c0905e81cbd8cf83341d7c6fe181cd17675/src/tools/definitions.ts) declare 14 tools. They cover channel information, stream information, top games, game lookup, category search, channel search, streams, global emotes, global badges, users, clips, chat settings, videos, and video comments.

Its [user handler](https://github.com/prime-optimal/twitch-mcp-server/blob/d8896c0905e81cbd8cf83341d7c6fe181cd17675/src/tools/handlers/user.ts) maps description, profile picture, and offline placeholder fields. Its channel handler omits the offline image. The server declares no profile update or extension tools.

This slice follows that public-field mapping through the existing authenticated adapter. It copies no upstream implementation and adds no server dependency. The undocumented video-comments operation remains excluded. This review inspected upstream source without starting that server.
