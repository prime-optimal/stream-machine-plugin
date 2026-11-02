# Plugin package reference

`mcp.json` registers two servers. `stream-machine` connects to the hosted Twitch endpoint on the Site. Its `extensions.com.openai.auth.type` is `oauth`, so the host connects it through the Stream Machine Sites app sign-in instead of starting it as a plain MCP server that needs `codex mcp login`. Without that declaration, every desktop chat logs `The stream-machine MCP server is not logged in`. `stream-machine-desktop` runs the local stdio server on a desktop host with Bun on `PATH`. The package is Stream Machine Desktop. Web and mobile hosts cannot launch the stdio server, so those hosts use the separate Stream Machine Site plugin for Twitch. Install the package through a local plugin marketplace as [Install on desktop](setup.md#install-on-desktop) describes. See the [hosted guide](hosted-mcp.md) for connection rules, and the [demo guide](demos/integration.md) for desktop features.

The package contains portable and compatibility manifests, skills, the bundled server and UI, worker bundles, documentation, and dependency notices. It does not need `node_modules` inside the archive. It contains no `fnox.toml`, secret references, secret values, or runtime databases.

The `mise run package` task rebuilds and validates `docs/packages/stream-machine-0.3.0.zip` and `docs/packages/stream-machine-0.3.0.tar.gz`. Names follow `plugin.json`. Both use the same staged payload and `stream-machine/` root, including hidden compatibility manifests. The copier excludes Finder metadata before staging. Archive validation still rejects metadata, dependency directories, environment files, Git metadata, and unexpected paths. Git ignores both archives.

The only documentation in the package is `docs/setup.md`, which the `self-update` skill links to. The rest of `docs/` stays in the repository. Its reviews, plans, statecharts, and verification scripts would add about 230,000 estimated tokens to the plugin without changing what it does.

The separate **Build plugin packages** workflow runs after each main push and on manual dispatch. It packages the exact event SHA with read-only repository permissions and no provider credentials. Its private Actions artifact name includes the version and full commit SHA. It does not bump versions or publish a release. See [Download a CI package](setup.md#download-a-ci-package) for the wrapper ZIP, retention, and rebuild procedure.

## Server and tools

The hosted `stream-machine` endpoint exposes nine Twitch tools. Each request uses its authenticated Sites caller's account. The #147 Site source adds three clip library tools; they appear after that source is published.

The `stream-machine-desktop` command runs `bun ${PLUGIN_ROOT}/dist/server.js` directly. It does not start fnox, so launching the plugin never asks 1Password for access. That server exposes 3 tools: `stream_machine_obs_preflight`, `stream_machine_obs_list_scenes`, and `stream_machine_obs_show_alert`. None of them reads a secret. It registers no UI resource.

The `stream-machine-streamdeck` command runs `bun ${PLUGIN_ROOT}/dist/streamdeck.js` as a separate stdio server (#192). It exposes 4 tools: `stream_machine_streamdeck_inventory`, `stream_machine_streamdeck_preview`, `stream_machine_streamdeck_apply`, and `stream_machine_streamdeck_release`. It starts the USB provider only when a tool needs it, and releases USB when stdin closes or the process receives SIGINT or SIGTERM. A host that stops this server frees the Stream Deck without affecting OBS. `mise run smoke` verifies the names of both servers' tools.

Issue #159 comments out every other registration in `src/server.ts`: the mock-sample workspace tools, update, Twitch, creative, worker, IGDB, analytics, transcription, and clip media tools, and the workspace UI resource. The source modules and their unit tests remain. Re-enable a tool by uncommenting its import and registration.

## State and limits

The provider tools perform real operations and report failures without substituting demo data. Title and button writes require the corresponding preview flow. Hosted Twitch credentials use encrypted owner-bound D1 records, and hosted title previews persist across requests.

The local browser preview is a development page, not a hosted MCP endpoint. Packaging does not upload or install the plugin. A successful browser test does not verify native host rendering.

## Provider connections

The package reuses local OBS tools and a pinned USB Stream Deck provider. Onboarding checks each selected connection.

Each provider retains its own connection and authorization. Stream Machine backend jobs do not inherit another plugin's tools or credentials. A desktop MCP host can call local OBS and Stream Deck servers directly.

The [integration inventory](integrations.md) records candidate providers and the review findings. The [setup guide](setup.md) contains commands for the demo and package.
