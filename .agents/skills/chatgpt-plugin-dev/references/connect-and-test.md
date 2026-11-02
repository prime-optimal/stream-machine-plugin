# Connect and test

Source: https://developers.openai.com/plugins/deploy/connect-chatgpt, /build/mcp-server.

## Connect a hosted server

1. Run the server on HTTPS. For local work use a tunnel or the Secure MCP Tunnel.
2. Open `chatgpt.com/plugins`, choose `+`, then Add custom MCP server, then Create as a plugin. Expected result: a plugin with an id like `plugin_asdk_app...`.
3. After any change to tools, descriptions or UI metadata, press Refresh on the plugin page.
4. Start a new conversation. Mention the plugin with `@`.

The old path (Settings, Apps & Connectors, Advanced, Developer Mode) in `build-chatgpt-app` is superseded by this flow.

## Other test paths

- MCP Inspector: `npx @modelcontextprotocol/inspector`. Checks `tools/list`, schemas, `resources/read` and widget HTML.
- API Playground: Tools, Add, MCP Server.
- Secure MCP Tunnel: fine for testing, not accepted for public submission. Field note: it sends `server/discover` before `initialize`, so keep legacy `initialize` working on stdio.

## Eval set

Write four groups of prompts and run them in a new conversation after each Refresh:

| Group | Check |
| --- | --- |
| Direct | Names the plugin. The right tool fires. |
| Indirect | States the goal only. The plugin is chosen. |
| Follow-up | A second turn reuses earlier results. |
| Negative | Out-of-scope prompts do not trigger the plugin. |

Fix tool descriptions and server `instructions` before changing code. These prompts feed the 5 positive and 3 negative review test cases.

## Checks before submitting

- Works on desktop and mobile, including UI (plugin-guidelines, Testing).
- Test account has demo data, no MFA, no sign-up step.
- UI: use `chatgpt-plugin-ui` and its screenshot procedure.
