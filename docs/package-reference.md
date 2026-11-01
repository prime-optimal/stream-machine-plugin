# Desktop package reference

The prototype package runs on a desktop host that supports local stdio MCP. The host needs Bun and fnox on `PATH`. The live setup is documented in the [demo guide](demos/integration.md).

The package contains portable and compatibility manifests, `fnox.toml` secret references, skills, the bundled server and UI, worker bundles, documentation, and dependency notices. It does not need `node_modules` inside the archive. Secret values and runtime databases are excluded.

The `mise run package` task regenerates `docs/packages/stream-machine-0.2.0.tar.gz`. Git ignores this generated archive.

## Server and tools

The command in `mcp.json` resolves optional private credentials with fnox, then runs `bun ${PLUGIN_ROOT}/dist/server.js`. The server retains these mock-sample tools:

| Tool | Behavior |
| --- | --- |
| `stream_machine_open` | Returns the demo workspace and declares a global entrypoint. |
| `stream_machine_workspace` | Returns the demo workspace and declares a thread entrypoint. |
| `stream_machine_connect_demo` | Selects the fictional Twitch account. |
| `stream_machine_list_recipes` | Returns the recipe catalog and capability status. |
| `stream_machine_preview` | Returns proposed channel updates without applying them. |
| `stream_machine_reset` | Disconnects the fictional account. |

The server also registers three OBS tools, four USB Stream Deck tools, five Twitch tools, five creative tools, and four worker controls. `mise run smoke` verifies the current total of 27 and the mock boundary. The UI resource uses `text/html;profile=mcp-app`.

## State and limits

The fictional sample remains mock-only. The provider tools perform real operations and report failures without substituting sample data. Title and button writes require the corresponding preview flow. The background worker starts separately and remains paused until explicitly armed.

The fictional sample's connection state lasts for the current MCP process. A restart disconnects that sample account. Real Twitch credentials use the encrypted local store. Creative requests and worker event IDs have separate local records. The prototype does not provide multi-user authentication.

The local browser preview is a development page, not a hosted MCP endpoint. Packaging does not upload or install the plugin. A successful browser test does not verify native host rendering.

## Provider connections

The package reuses local OBS tools, a pinned USB Stream Deck provider, local Twitch OAuth storage, and the existing OpenDesign service. Onboarding checks each selected connection. The credential references are specific to the creator's private setup.

Each provider retains its own connection and authorization. Stream Machine backend jobs do not inherit another plugin's tools or credentials. A desktop MCP host can call local OBS and Stream Deck servers directly.

The [integration inventory](integrations.md) records candidate providers and the review findings. The [setup guide](setup.md) contains commands for the demo and package.
