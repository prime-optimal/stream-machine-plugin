# Run Stream Machine architecture prototype

Requires Bun 1.4.4 on PATH; project tooling uses mise. No Twitch credentials required.

```sh
mise trust
mise run install
mise run check
mise run test
mise run smoke
mise run preview
```

Open http://127.0.0.1:4317/?preview=1. Choose **Use demo Twitch account**, select **Prepare channel details**, enter title/category, then preview. Reset disconnects demo account. Preview server binds loopback only; no public deployment.

## MCP package

`mise run package` writes `docs/packages/stream-machine-0.1.0.tar.gz`. Package includes portable manifests, onboarding/recipe skills, bundled server/UI, and dependency notices. Unpack into a host-managed plugin directory using supported host installation flow. `mcp.json` runs `bun ${PLUGIN_ROOT}/dist/server.js`; no node_modules installation needed inside archive.

This package needs a desktop host that supports local stdio MCP and Bun on PATH. No account upload, host installation, or native-view verification is implied by local packaging. Local browser preview is a development harness, not a hosted MCP endpoint.

Six tools: open hub, open thread workspace, connect demo, list recipes, preview, reset. Global/thread entrypoint metadata and one `text/html;profile=mcp-app` UI resource are supplied. Every operation is mock-only. No live auth, provider execution, or apply tool exists.

State lives in current MCP process; restarting disconnects demo. Preview browser has its own state, separate from installed MCP process. No multi-user hosting or persistent run history yet.

## Optional integrations

Onboarding can discover existing provider plugins and offer relevant setup. Installation/connection remains provider-specific. Stream Machine does not automatically inherit another plugin's tools or authorization in backend jobs.

OBS and Stream Deck can run directly through local MCP. No separate bridge is required for desktop orchestration. Read [integration inventory](integrations.md) before enabling candidates. None are included in current MCP configuration. Existing provider plugin connections stay independent; never paste credentials into chat.
