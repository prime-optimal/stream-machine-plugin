# Integration inventory

Status: source review and architecture recommendations. No external server installed, vendored, connected, or exercised by this review. User reports existing OpenDesign Cloud deployment/plugin and Stream Deck hardware; deployed contracts and device state remain unverified here.

Repository: https://github.com/prime-optimal/stream-machine-plugin

Project: [Stream Machine #18](https://github.com/users/prime-optimal/projects/18)

Default labels: `feat`, `phase:architecture`, `priority:p1`.

## Adoption policy

Prefer an existing authenticated plugin connection when available. Otherwise use a pinned local MCP dependency behind a narrow adapter. Vendor source only when justified by missing capabilities, with license/provenance review and explicit maintenance ownership. Registry presence, repository existence, and working integration are separate facts.

Record upstream repository, commit/release, transport, execution location, authentication, supported actions, side effects, license, and verification status for each adapter. Preserve upstream credentials and host connection selection. Never infer connection IDs or register placeholder endpoints.

## Primary candidates

| Integration | Verified source contract | Recommendation |
| --- | --- | --- |
| Twitch | Existing Stream Makeover user OAuth core; no reusable EventSub delivery implementation established | Extract auth domain later; implement explicit Helix capabilities behind adapter |
| Stream Deck | Python stdio server; native profile authoring default; separate USB server | Optional local dependency; inventory and preview first |
| OBS | Go stdio MCP server over OBS WebSocket; separate localhost dashboard/screenshot HTTP | Optional local dependency; enforce action allowlist outside upstream server |
| OpenDesign Cloud | User already has deployment/plugin; upstream repo includes local stdio project API | Reuse existing plugin, verify its deployed contract independently |
| Canva | Prefer existing plugin connection | Discover actual tools/auth before choosing recipe actions |
| HyperFrames | Existing project CLI-based authoring and portable HTML output | Optional local renderer; dedicated plugin remains unverified after directory search returned no result |

## Stream Deck

[prime-optimal/streamdeck-mcp](https://github.com/prime-optimal/streamdeck-mcp) declares package `0.3.0`, Python ≥3.11, and two commands: profile writer `streamdeck-mcp`, USB server `streamdeck-mcp-usb`. [Package contract](https://github.com/prime-optimal/streamdeck-mcp/blob/main/pyproject.toml), [stdio entrypoint](https://github.com/prime-optimal/streamdeck-mcp/blob/main/profile_server.py#L953).

Profile writer reads/writes Elgato ProfilesV3 with V2 fallback, discovers installed actions, reuses configured buttons/dials, generates icons, and creates executable shell scripts. Default workflow targets macOS/Windows Elgato app; USB mode supports headless/Linux setups. Nine profile tools declared in source. [Tool declarations](https://github.com/prime-optimal/streamdeck-mcp/blob/main/profile_server.py#L299), [README](https://github.com/prime-optimal/streamdeck-mcp/blob/main/README.md#L150).

Profile mutation requires quit→write→relaunch because Elgato app can overwrite file changes. macOS can automate that cycle; Windows instructions require manual quit/relaunch. Treat this as explicit workflow impact. Avoid generic script creation in first live recipe. [Write constraints](https://github.com/prime-optimal/streamdeck-mcp/blob/main/README.md#L230).

MIT core; retain notices if redistributing. Bundled MDI assets have separate license. Fork retains upstream package identity, so generic package install may resolve upstream instead of this fork. Pin selected source deliberately. [LICENSE](https://github.com/prime-optimal/streamdeck-mcp/blob/main/LICENSE), [MDI license](https://github.com/prime-optimal/streamdeck-mcp/blob/main/streamdeck_assets/MDI-LICENSE).

## OBS

[prime-optimal/agentic-obs](https://github.com/prime-optimal/agentic-obs) starts MCP with `StdioTransport`. Its HTTP listener serves dashboard/screenshots, not remote MCP. Defaults point to localhost OBS WebSocket; OBS credentials/config are stored locally in SQLite. [Transport](https://github.com/prime-optimal/agentic-obs/blob/main/internal/mcp/server.go#L297), [config](https://github.com/prime-optimal/agentic-obs/blob/main/config/config.go#L64).

README advertises scene/source/audio controls, recording/streaming, presets, screenshots, automation, resources, and prompts. Tool count is documentation-reported, not independently reconciled. Runtime discovery is authoritative. [README](https://github.com/prime-optimal/agentic-obs/blob/main/README.md#L9).

Group configuration is not sufficient authorization: Core combines reads with broadcast writes, and meta tools can change enabled groups. Adapter must enforce action policy independently. First live checks should list status/scenes only. Never start/stop a broadcast as incidental verification. [Groups](https://github.com/prime-optimal/agentic-obs/blob/main/config/config.go#L159), [meta tools](https://github.com/prime-optimal/agentic-obs/blob/main/README.md#L288).

Actual LICENSE is MIT despite stale README placeholder. Module/install examples retain upstream identity; pin chosen fork. [LICENSE](https://github.com/prime-optimal/agentic-obs/blob/main/LICENSE).

## OpenDesign Cloud

Preserve existing deployment and plugin. Upstream [nexu-io/open-design](https://github.com/nexu-io/open-design) package inspected at `0.25.1`; local stdio MCP proxies daemon project operations. Tools include brief collection, project/artifact/file operations, and design-run lifecycle. [Package](https://github.com/nexu-io/open-design/blob/main/package.json), [tools](https://github.com/nexu-io/open-design/blob/main/apps/daemon/src/mcp.ts#L365), [transport](https://github.com/nexu-io/open-design/blob/main/apps/daemon/src/mcp.ts#L2059).

Upstream `mcp-oauth.ts` handles outbound OAuth to other MCP servers; it does not establish inbound authentication for user's deployed endpoint. Discover deployed tools, auth, and artifact references before binding recipes. [OAuth direction](https://github.com/nexu-io/open-design/blob/main/apps/daemon/src/mcp-oauth.ts#L1).

Apache-2.0 core; bundled templates/skills can retain separate licenses. No reason to copy the daemon into Stream Machine. [LICENSE](https://github.com/nexu-io/open-design/blob/main/LICENSE), [third-party license note](https://github.com/nexu-io/open-design/blob/main/README.md#L735).

## Twitch capability boundaries

Developer account/API access does not replace each streamer's user authorization. Scope requests follow selected capabilities. Keep app tokens, user tokens, and plugin caller identity distinct. [Twitch authentication](https://dev.twitch.tv/docs/authentication/).

Channel updates require user authorization with `channel:manage:broadcast`. Official clip download requires the applicable `channel:manage:clips` or `editor:manage:clips` grant; listing clips is not downloading them. [Channel updates](https://dev.twitch.tv/docs/api/reference/#modify-channel-information), [clip downloads](https://dev.twitch.tv/docs/api/reference/#get-clips-download).

Analytics must name its dataset: Twitch's developer analytics endpoints cover extensions/games, not the full broadcaster Creator Dashboard. Store collected event statistics with explicit coverage and timestamps. [Twitch insights](https://dev.twitch.tv/docs/insights/).

EventSub webhook subscription creation uses an app token plus required user grants; WebSocket subscriptions use user tokens. Select transport only when execution location and unattended behavior are decided. [Subscription management](https://dev.twitch.tv/docs/eventsub/manage-subscriptions/).

## Additional source-reviewed candidates

These candidates remain unbound. Findings below describe inspected source; no runtime compatibility or authentication verification performed.

| Candidate | Boundary found | Decision |
| --- | --- | --- |
| [mcp-igdb](https://github.com/prime-optimal/mcp-igdb) | Stdio relay through Pipeworx, not direct IGDB API adapter; MIT LICENSE present | Optional game metadata capability only after relay dependency/auth review |
| [obs-twitch-mcp](https://github.com/prime-optimal/obs-twitch-mcp) | Broad FastMCP tools; startup includes chat/spam-ban behavior; auth helper emits tokens and uses local JSON storage | Requires adaptation before adoption; never start as harmless discovery |
| [twitch-mcp-server](https://github.com/prime-optimal/twitch-mcp-server) | App-token, read-only Twurple stdio; no user OAuth/EventSub/download; undocumented GraphQL comments path | Possible read adapter reference; exclude undocumented comments path |
| [yt-media-info-mcp](https://github.com/prime-optimal/yt-media-info-mcp) | Metadata/transcripts/search, no media downloads; stdio frontend plus Python service; HTTP auth optional and default bind broad | Do not label downloader; keep service private if adopted |

MIT LICENSE files found for IGDB/media candidates. OBS/Twitch candidate package declarations mention MIT, but standalone license files were not found during review. Review redistribution notices before copying source. No vendoring planned.

## First adapter acceptance

Verify one harmless record before scale: a profile/status query, scene list, deck inventory, or design artifact read. Record provider version, normalized capability result, and limitations. Add writes only after preview describes exact target/change and server-side policy enforces authorized operation. Optional dependency failure must leave unrelated recipes usable.
