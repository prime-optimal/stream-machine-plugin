# Integration choices

Stream Machine uses existing plugins and local MCP servers to avoid maintaining copies of their authentication and device controls. This document explains the proposed integrations and the constraints found during source review.

The initial review inspected source without running external servers. The later [reuse audit](reuse-evidence.md) found recorded acceptance for Twitch OAuth and the Sealos OpenDesign service. It also identified OpenDesign's integrated HyperFrames workflow. These existing implementations are the starting points for V1. Version numbers below describe inspected source, not current releases.

The repository is [prime-optimal/stream-machine-plugin](https://github.com/prime-optimal/stream-machine-plugin).

The project board is [Stream Machine #18](https://github.com/users/prime-optimal/projects/18).

The default issue labels are `feat`, `phase:architecture`, and `priority:p1`.

## Adoption policy

An existing authenticated plugin is the first choice because it retains the provider's connection and hosting. A local MCP dependency is the next choice when the task needs access to a device or local process. An adapter translates Stream Machine capabilities into calls to that dependency.

The design calls for each dependency to use a specific release or commit. Copying source into this repository would also require a license review, a source record, and a named maintainer. A repository or directory listing alone does not prove that an integration works.

Each adapter's record identifies the upstream repository, version, transport, execution location, authentication, supported actions, side effects, license, and verification status. The host retains credential handling and connection selection. Stream Machine uses only verified connection IDs and endpoints.

## Primary candidates

The proposed choices reflect each integration's execution and authentication requirements.

| Integration | Source review finding | Proposed choice |
| --- | --- | --- |
| Twitch | Stream Makeover has merged OAuth code and recorded real-account verification. EventSub delivery remains separate work. | Connect Stream Machine to the existing flow now. Add only the permission and API call needed for the title demo. |
| Stream Deck | A Python stdio server writes native profiles. A separate server controls USB devices. | Use an optional local dependency, starting with inventory and previews. |
| OBS | A Go stdio MCP server connects to OBS WebSocket. Separate HTTP endpoints provide a dashboard and screenshots. | Use an optional local dependency with an adapter that permits specific actions. |
| OpenDesign service | The Sealos deployment has recorded authenticated MCP checks and accepted alert and overlay scenarios. | Restore or verify the existing connection and return one artifact through Stream Machine. Do not redeploy the service. |
| Canva | This review did not verify the plugin's tools or authentication. | Prefer an existing plugin connection after those checks. |
| OpenDesign HyperFrames | OpenDesign already defines its composition and daemon-render workflow. | Use that workflow for one short MP4. Do not start with a separate vanilla renderer. |

## Stream Deck

[prime-optimal/streamdeck-mcp](https://github.com/prime-optimal/streamdeck-mcp) declares version `0.3.0` and requires Python 3.11 or later. The `streamdeck-mcp` command starts the profile writer. The `streamdeck-mcp-usb` command starts the USB server. [Package definition](https://github.com/prime-optimal/streamdeck-mcp/blob/main/pyproject.toml), [stdio entrypoint](https://github.com/prime-optimal/streamdeck-mcp/blob/main/profile_server.py#L953).

The profile writer reads and writes Elgato ProfilesV3, with ProfilesV2 as a fallback. It discovers installed actions, reuses configured buttons and dials, generates icons, and creates executable shell scripts. The default workflow targets the Elgato app on macOS and Windows. USB mode supports Linux and headless setups. [Tool declarations](https://github.com/prime-optimal/streamdeck-mcp/blob/main/profile_server.py#L299), [installation options](https://github.com/prime-optimal/streamdeck-mcp/blob/main/README.md#L150).

Profile updates require the Elgato app to quit before a write and restart afterward. Otherwise, the app can overwrite the changed files. The macOS workflow can automate that cycle. The Windows instructions require the user to quit and restart the app. This interruption belongs in the recipe preview. The first live recipe excludes general-purpose script creation because executable scripts require a separate review of their effects. [Write constraints](https://github.com/prime-optimal/streamdeck-mcp/blob/main/README.md#L230).

The core uses the MIT license, which requires notices in redistributed copies. Bundled MDI assets have a separate license. The fork retains the upstream package identity, so a generic package installation may select the upstream version. Stream Machine therefore needs an explicit source version. [MIT license](https://github.com/prime-optimal/streamdeck-mcp/blob/main/LICENSE), [MDI license](https://github.com/prime-optimal/streamdeck-mcp/blob/main/streamdeck_assets/MDI-LICENSE).

## OBS

[prime-optimal/agentic-obs](https://github.com/prime-optimal/agentic-obs) starts MCP with `StdioTransport`. Its HTTP listener provides the dashboard and screenshots. It does not provide remote MCP access. The default OBS WebSocket address is localhost, and the server stores OBS credentials and configuration in local SQLite. [Transport implementation](https://github.com/prime-optimal/agentic-obs/blob/main/internal/mcp/server.go#L297), [configuration](https://github.com/prime-optimal/agentic-obs/blob/main/config/config.go#L64).

The README lists controls for scenes, sources, audio, recording, and streaming. It also describes presets, screenshots, automation, resources, and prompts. The review did not reconcile the documented tool count with the implementation. An adapter must discover the tools available from the running server. [Documented features](https://github.com/prime-optimal/agentic-obs/blob/main/README.md#L9).

Tool groups cannot enforce the required permissions. The Core group combines reads with broadcast changes, and meta tools can enable other groups. The adapter must check each action independently. Initial live verification is limited to status and scene lists. It must never start or stop a broadcast. [Tool groups](https://github.com/prime-optimal/agentic-obs/blob/main/config/config.go#L159), [meta tools](https://github.com/prime-optimal/agentic-obs/blob/main/README.md#L288).

The `LICENSE` file specifies MIT, although the README contains an outdated license placeholder. The module and installation examples retain the upstream identity. An explicit source version is needed to select the intended fork. [MIT license](https://github.com/prime-optimal/agentic-obs/blob/main/LICENSE).

## OpenDesign service

For this prototype, the existing Sealos deployment is the chosen starting point. Its authenticated remote MCP path is documented in the [reuse evidence](reuse-evidence.md#sealos-opendesign-service). The upstream-only observations below explain why a repository inspection alone did not establish that deployed behavior.

The existing deployment and plugin avoid the need for a second server. The inspected [nexu-io/open-design](https://github.com/nexu-io/open-design) package declares version `0.25.1`. Its local stdio MCP process forwards project operations to the daemon. Tools collect briefs, manage projects and artifacts, read and write files, and control design runs. [Package definition](https://github.com/nexu-io/open-design/blob/main/package.json), [tool declarations](https://github.com/nexu-io/open-design/blob/main/apps/daemon/src/mcp.ts#L365), [transport implementation](https://github.com/nexu-io/open-design/blob/main/apps/daemon/src/mcp.ts#L2059).

The upstream `mcp-oauth.ts` handles outbound OAuth to other MCP servers. That code does not establish how the user's deployed endpoint authenticates incoming requests. Recipe integration still requires verification of that endpoint's tools, authentication, and artifact references. [OAuth client implementation](https://github.com/nexu-io/open-design/blob/main/apps/daemon/src/mcp-oauth.ts#L1).

The core uses Apache-2.0. Bundled templates and skills can retain separate licenses. Reusing the existing connection avoids copying and maintaining the daemon in Stream Machine. [Apache-2.0 license](https://github.com/nexu-io/open-design/blob/main/LICENSE), [third-party license note](https://github.com/nexu-io/open-design/blob/main/README.md#L735).

## Twitch capability boundaries

A developer account with API access does not replace each streamer's authorization. Requested scopes depend on the selected capability. App tokens, user tokens, and the plugin caller's identity have distinct roles in the design. [Twitch authentication](https://dev.twitch.tv/docs/authentication/).

Channel updates require user authorization with `channel:manage:broadcast`. Official clip downloads require the applicable `channel:manage:clips` or `editor:manage:clips` grant. A tool that lists clips does not necessarily download them. [Channel updates](https://dev.twitch.tv/docs/api/reference/#modify-channel-information), [clip downloads](https://dev.twitch.tv/docs/api/reference/#get-clips-download).

Twitch's developer analytics endpoints cover extensions and games. They do not expose the full broadcaster Creator Dashboard. Stream Machine therefore needs to name each analytics dataset and record the coverage and timestamps of collected event statistics. [Twitch insights](https://dev.twitch.tv/docs/insights/).

EventSub webhook subscription creation uses an app token plus the required user grants. WebSocket subscriptions use user tokens. The transport choice depends on where the subscription runs and whether delivery must continue while chat is closed. [Subscription management](https://dev.twitch.tv/docs/eventsub/manage-subscriptions/).

## Additional source-reviewed candidates

These candidates have no configured connection. The review inspected their source but did not verify runtime compatibility or authentication.

| Candidate | Source review finding | Proposed choice |
| --- | --- | --- |
| [mcp-igdb](https://github.com/prime-optimal/mcp-igdb) | It relays stdio requests through Pipeworx rather than calling IGDB directly. An MIT `LICENSE` file is present. | Consider game metadata after reviewing the relay dependency and its authentication. |
| [obs-twitch-mcp](https://github.com/prime-optimal/obs-twitch-mcp) | It exposes broad FastMCP tools. Startup includes chat handling and spam bans. Its authentication helper emits tokens and stores them in local JSON. | Adapt the server before adoption. Starting it is not a harmless discovery check. |
| [twitch-mcp-server](https://github.com/prime-optimal/twitch-mcp-server) | It uses app tokens for read-only Twurple calls over stdio. It has no user OAuth, EventSub, or downloads. Its comments code uses undocumented GraphQL. | Consider the read operations as a reference. Exclude the undocumented comments code. |
| [yt-media-info-mcp](https://github.com/prime-optimal/yt-media-info-mcp) | It provides metadata, transcripts, and search, but no media downloads. It combines a stdio frontend with a Python service. HTTP authentication is optional, and the default service address is not restricted to loopback. | Not adopted. `stream_machine_media_info` (#40) uses Twitch clip metadata and the OpenAI transcription tool instead. |

The review found MIT `LICENSE` files in `mcp-igdb` and `yt-media-info-mcp`. The package declarations for `obs-twitch-mcp` and `twitch-mcp-server` mention MIT, but the review found no standalone license files. Copying their source would require a review of redistribution notices. The current proposal copies none of these implementations.

## First adapter acceptance

An adapter's first verification covers one harmless result, such as a profile query, scene list, deck inventory, or design artifact. The record includes the provider version, the adapter's result, and known limits. Writes require a preview of the exact target and change, plus server-side authorization. Failure of an optional dependency must leave unrelated recipes usable.
