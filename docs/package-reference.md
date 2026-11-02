# Plugin package reference

`mcp.json` registers four servers. `stream-machine` connects to the hosted Twitch endpoint on the Site. Its `extensions.com.openai.auth.type` is `oauth`, so the host connects it through the Stream Machine Sites app sign-in instead of requiring `codex mcp login`. The local servers are `stream-machine-obs` (`dist/obs-server.js`), `stream-machine-streamdeck` (`dist/server.js`), and `stream-machine-creative` (`dist/creative-server.js`). They require a desktop host with Bun on `PATH`. Web and mobile hosts use the separate Site plugin for Twitch. See [Install on desktop](setup.md#install-on-desktop), the [hosted guide](hosted-mcp.md), and the [demo guide](demos/integration.md).

The package contains portable and compatibility manifests, skills, the bundled server and UI, worker bundles, documentation, and dependency notices. It does not need `node_modules` inside the archive. It contains no `fnox.toml`, secret references, secret values, or runtime databases.

The `mise run package` task rebuilds and validates ZIP and tar.gz archives under `docs/packages/`, named with the version in `plugin.json`. Both use the same staged payload and `stream-machine/` root, including hidden compatibility manifests. The copier excludes Finder metadata before staging. Archive validation still rejects metadata, dependency directories, environment files, Git metadata, and unexpected paths. Git ignores both archives.

The only documentation in the package is `docs/setup.md`, which the `self-update` skill links to. The rest of `docs/` stays in the repository. Its reviews, plans, statecharts, and verification scripts would add about 230,000 estimated tokens to the plugin without changing what it does.

The separate **Build plugin packages** workflow runs after each main push and on manual dispatch. It packages the exact event SHA with read-only repository permissions and no provider credentials. Its private Actions artifact name includes the version and full commit SHA. It does not bump versions or publish a release. See [Download a CI package](setup.md#download-a-ci-package) for the wrapper ZIP, retention, and rebuild procedure.

## Server and tools

The hosted `stream-machine` endpoint exposes Twitch and clip tools. Each request uses its authenticated Sites caller's account. Its tool inventory is managed in the independent Site source.

The OBS server exposes seven tools for preflight, scene listing, scene and Browser Source creation/removal, and the existing alert. The Stream Deck server exposes six tools for inventory, layout preview/apply, button update/clear, and release. These servers do not start fnox or register a UI resource. `mise run smoke` verifies their exact tool inventories.

The creative server exposes six tools: project listing, project creation, generation start, request status, artifact read, and workspace open. Its widget calls tools on that same server. OpenDesign authorization stays in the server environment. Workspace open and resource reads do not call OpenDesign. `mise exec -- bun scripts/package-smoke.ts` checks all three local servers and the creative UI resource in the staged package.

Other registrations remain disabled in `src/server.ts`, including the old mock workspace, Twitch, worker, analytics, transcription, and clip media tools. Creative tools are registered by `src/creative-server.ts`; do not restore their old registration in the Stream Deck server. Source modules and unit tests for disabled tools remain in the repository.

## State and limits

The provider tools perform real operations and report failures without substituting demo data. Title and button writes require the corresponding preview flow. Hosted Twitch credentials use encrypted owner-bound D1 records, and hosted title previews persist across requests.

The local browser preview is a development page, not a hosted MCP endpoint. Packaging does not upload or install the plugin. A successful browser test does not verify native host rendering.

## Provider connections

The package reuses local OBS tools and a pinned USB Stream Deck provider. Onboarding checks each selected connection.

Each provider retains its own connection and authorization. Stream Machine backend jobs do not inherit another plugin's tools or credentials. A desktop MCP host can call local OBS and Stream Deck servers directly.

The [integration inventory](integrations.md) records candidate providers and the review findings. The [setup guide](setup.md) contains commands for the demo and package.
