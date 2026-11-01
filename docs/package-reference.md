# Desktop package reference

The prototype package runs on a desktop host that supports local stdio MCP. The host needs Bun on `PATH`.

The package contains `plugin.json`, `mcp.json`, onboarding and recipe skills, the bundled server and UI, documentation, and dependency notices. It does not need `node_modules` inside the archive.

The `mise run package` task regenerates the archive at `docs/packages/stream-machine-0.1.0.tar.gz`. The archive is generated output that Git ignores.

## Server and tools

The command in `mcp.json` is `bun ${PLUGIN_ROOT}/dist/server.js`. The server registers these tools:

| Tool | Behavior |
| --- | --- |
| `stream_machine_open` | Returns the demo workspace and declares a global entrypoint. |
| `stream_machine_workspace` | Returns the demo workspace and declares a thread entrypoint. |
| `stream_machine_connect_demo` | Selects the fictional Twitch account. |
| `stream_machine_list_recipes` | Returns the recipe catalog and capability status. |
| `stream_machine_preview` | Returns proposed channel updates without applying them. |
| `stream_machine_reset` | Disconnects the fictional account. |

The `mise run smoke` task checks the tool count and discovery over stdio. It also reads the UI resource, whose MIME type is `text/html;profile=mcp-app`.

## State and limits

All operations use mock data. The package has no live authorization, provider execution, or apply tool.

Demo connection state lasts for the current MCP process. A restart disconnects the demo account. The browser preview uses a separate workspace. Neither workspace has persistent run history or multi-user authentication.

The local browser preview is a development page, not a hosted MCP endpoint. Packaging does not upload or install the plugin. A successful browser test does not verify native host rendering.

## Provider connections

The MCP configuration includes no external providers. Onboarding can discover existing provider plugins through host tools and offer their setup flows.

Each provider retains its own connection and authorization. Stream Machine backend jobs do not inherit another plugin's tools or credentials. A desktop MCP host can call local OBS and Stream Deck servers directly.

The [integration inventory](integrations.md) records candidate providers and the review findings. The [setup guide](setup.md) contains commands for the demo and package.
