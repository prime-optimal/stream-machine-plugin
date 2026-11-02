# Plugin package reference

`mcp.json` registers two servers. `stream-machine` connects to the authenticated Site-hosted Twitch endpoint. `stream-machine-local` runs the local stdio server on a desktop host with Bun and fnox on `PATH`. Web and mobile hosts cannot launch the local server and use only the hosted one. See the [hosted guide](hosted-mcp.md) for connection and fallback rules, and the [demo guide](demos/integration.md) for desktop features.

The package contains portable and compatibility manifests, `fnox.toml` secret references, skills, the bundled server and UI, worker bundles, documentation, and dependency notices. It does not need `node_modules` inside the archive. Secret values and runtime databases are excluded.

The `mise run package` task rebuilds and validates `docs/packages/stream-machine-0.3.0.zip` and `docs/packages/stream-machine-0.3.0.tar.gz`. Names follow `plugin.json`. Both use the same staged payload and `stream-machine/` root, including hidden compatibility manifests. The copier excludes Finder metadata before staging. Archive validation still rejects metadata, dependency directories, environment files, Git metadata, and unexpected paths. Git ignores both archives.

The separate **Build plugin packages** workflow runs after each main push and on manual dispatch. It packages the exact event SHA with read-only repository permissions and no provider credentials. Its private Actions artifact name includes the version and full commit SHA. It does not bump versions or publish a release. See [Download a CI package](setup.md#download-a-ci-package) for the wrapper ZIP, retention, and rebuild procedure.

## Server and tools

The hosted endpoint exposes nine Twitch tools. Each request uses its authenticated Sites caller's account. The `stream-machine-local` command resolves optional private credentials with fnox, then runs `bun ${PLUGIN_ROOT}/dist/server.js`. That local server exposes 34 tools, including its own Twitch tools for the explicit fallback. It retains these mock-sample tools:

| Tool | Behavior |
| --- | --- |
| `stream_machine_open` | Returns the demo workspace and declares a global entrypoint. |
| `stream_machine_workspace` | Returns the demo workspace and declares a thread entrypoint. |
| `stream_machine_connect_demo` | Selects the fictional Twitch account. |
| `stream_machine_list_recipes` | Returns the recipe catalog and capability status. |
| `stream_machine_preview` | Returns proposed channel updates without applying them. |
| `stream_machine_reset` | Disconnects the fictional account. |

The local server also registers three OBS tools, four USB Stream Deck tools, nine Twitch tools, five creative tools, four worker controls, one independent OpenAI transcription tool, and two package-update tools. `mise run smoke` verifies the current total of 34 and the mock boundary. The profile read returns the connected account description, photo, and offline image. See the [Twitch profile reference](twitch-profile.md). The local UI resource uses `text/html;profile=mcp-app`.

The transcription tool explicitly uploads one selected local audio file to OpenAI. It resolves `OPENAI_API_KEY` through fnox and stays independent of Twitch metadata and URL-based providers. See [Transcribe one local audio file](demos/transcription.md).

## State and limits

The fictional demo remains mock-only. The provider tools perform real operations and report failures without substituting demo data. Title and button writes require the corresponding preview flow. The independent worker starts separately and remains paused until explicitly armed.

The fictional demo's connection state lasts for the current local MCP process. A restart disconnects that demo account. Hosted Twitch credentials use encrypted owner-bound D1 records; hosted title previews persist across requests. The explicit desktop fallback has its own encrypted local store. Creative requests and worker event IDs have separate local records.

The local browser preview is a development page, not a hosted MCP endpoint. Packaging does not upload or install the plugin. A successful browser test does not verify native host rendering.

## Provider connections

The package reuses local OBS tools, a pinned USB Stream Deck provider, local Twitch OAuth storage, and the existing OpenDesign service. Onboarding checks each selected connection. The credential references are specific to the creator's private setup.

Each provider retains its own connection and authorization. Stream Machine backend jobs do not inherit another plugin's tools or credentials. A desktop MCP host can call local OBS and Stream Deck servers directly.

The [integration inventory](integrations.md) records candidate providers and the review findings. The [setup guide](setup.md) contains commands for the demo and package.
