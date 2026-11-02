# Game lookup module reference

Issue #41 adds a read-only game lookup to the plugin server. The bundled MCP stdio host exposes game text and an artwork reference. No graphical view was added.

## Tool contract

`registerGameTools(server)` from `src/adapters/igdb/register.ts` registers `stream_machine_game_lookup({ twitchCategoryId })`. The input is a positive decimal string of at most 20 digits, without leading zeros.

The result keeps `twitchCategoryId` and `igdbId` separate. It contains the category name, game name, optional summary and release date, genres, optional HTTPS artwork reference, source URLs, provider hosts, and retrieval time. Missing details remain absent. No name-based fallback or mock result exists.

The client rejects unsafe numeric IGDB response IDs instead of rounding them. Dates are IGDB's game-level `first_release_date`, not a platform-specific release history.

## Providers and credentials

The token request goes to `id.twitch.tv`. Category lookup goes to `api.twitch.tv`. The mapped game query goes to `api.igdb.com`. Artwork URLs reference `images.igdb.com`; the module does not fetch artwork.

Credentials are server-only `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`. Application authorization does not require streamer OAuth. Tokens stay in memory. Concurrent token requests share acquisition. Each request has a 12-second deadline and rejects redirects. A rejected token permits one renewal and one repeated read. Rate limits return `GAME_RATE_LIMITED` without polling. IGDB allows four requests per second and eight open requests; the module does not schedule batches.

The supplied [mcp-igdb relay source](https://github.com/prime-optimal/mcp-igdb/blob/b890793649777bb9f80a0b8c6f2b4de5ac87ac4e/lib/index.js) forwards JSON-RPC to Pipeworx. Direct requests avoid that third-party credential and transport boundary. The relay was source-reviewed, not runtime-tested.

Contracts reviewed on November 1, 2026:

- [Twitch Get Games](https://dev.twitch.tv/docs/api/reference/#get-games).
- [Twitch application token](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow).
- [IGDB requests and authentication](https://api-docs.igdb.com/#requests).
- [IGDB images](https://api-docs.igdb.com/#images) and [rate limits](https://api-docs.igdb.com/#rate-limits).

Artwork is a reference, not a license grant. Check provider terms before commercial use or redistribution.

## Verified lookup

On November 1, 2026 at 22:15:06 UTC, the module completed one real lookup using the workstation's existing age-encrypted cache. No credentials or tokens were printed.

| Field | Verified value |
| --- | --- |
| Twitch category | `33214`, Fortnite |
| Twitch-returned IGDB ID | `1905` |
| IGDB name | Fortnite |
| Genres | Shooter, Simulator |
| First release date returned | `2020-06-29T00:00:00.000Z` |
| Artwork reference | `https://images.igdb.com/igdb/image/upload/t_cover_big/cocxbi.jpg` |
| Game source | [Fortnite on IGDB](https://www.igdb.com/games/fortnite) |

This proves category mapping and live game data, not artwork rendering or plugin integration. No broadcaster actions occurred.

## Errors

Tool errors contain codes, not upstream response bodies or credentials. Codes distinguish missing configuration, invalid input, absent category, missing mapping, absent game, invalid response, authorization failure, rate limit, and unavailable provider. Network failures, invalid JSON, and deadlines return `GAME_PROVIDER_UNAVAILABLE`.

## Verification commands

- `mise exec -- bun test tests/igdb.test.ts`: exit 0, 29 tests.
- `mise run check`: exit 0 after correcting the environment-default type.
- `mise run test`: exit 0, 110 tests.
- `mise run build`: exit 0.
- Real lookup through `fnox --non-interactive` with the existing encrypted cache: exit 0.

The task worktree had no local credential cache. Verification explicitly selected the existing primary checkout's encrypted overlay. No cache was copied or refreshed. Normal runtime setup still requires the [secret setup procedure](../secrets.md).

## Bundled host verification

After the integration slot opened, `src/server.ts` added only the `registerGameTools` import and call. No sibling code or shutdown changes were copied. Before main reconciliation, this branch contained 28 tools, not the combined sibling count.

On November 1, 2026 at 22:19:26 UTC, `tests/igdb-stdio.ts` launched `dist/server.js` through the MCP SDK stdio client. It discovered the tool and called category `33214`. The host received Fortnite text and `https://images.igdb.com/igdb/image/upload/t_cover_big/cocxbi.jpg`. [Sanitized host result](../verification/41-game-lookup.json) records the mapping and public metadata.

The host was the MCP SDK Client on macOS, running Bun 1.4.4. This is bundled protocol-host proof, not a ChatGPT graphical view. No image was rendered or downloaded, so no graphical screenshot is claimed.

Verification before main reconciliation:

- `mise run check`: exit 0.
- `mise run test`: exit 0, 110 tests.
- `mise run build`: exit 0.
- `mise run smoke`: exit 0, 28 tools and invalid game input rejected.
- `mise run package`: exit 0, 112 archive entries inspected.
- `FNOX_NON_INTERACTIVE=1 mise exec -- bun scripts/package-smoke.ts`: exit 0, 28 tools through the packaged launch.
- `mise exec -- fnox --non-interactive -c /Users/prime/Documents/ChatGPT/stream-machine-plugin/fnox.local.toml exec -- bun tests/igdb-stdio.ts`: exit 0.

The last command used the existing primary checkout's age-encrypted cache. It did not copy credentials into the package. Keep #41 open and In Progress until the required PR merges. Cross-feature composition belongs to the coordinator; no sibling feature was cherry-picked.

## Current main reconciliation

The branch merged `origin/main` at `de577ad`, preserving #53's channel-profile tool. Both smoke scripts now expect 29 tools and check the profile and game tool names.

After reconciliation, check, 116 tests, build, smoke, package, hooks, and packaged launch all exited 0. Package inspection covered 119 entries. The real bundled-stdio lookup also exited 0 at 22:21:45 UTC, again returning Fortnite text and its artwork reference. The committed JSON proof now records 29 tools.

Only merge and epic-level composition remain. No feature from an unmerged sibling branch was copied.
