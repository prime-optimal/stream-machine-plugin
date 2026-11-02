# Desktop-only (local stdio) plugins

Source: https://developers.openai.com/plugins/deploy/desktop-only.

## Local entry

In root `mcp.json`, replace the HTTP server entry under `mcpServers` with a stdio entry:

```json
{
	"type": "stdio",
	"command": "node",
	"args": ["${PLUGIN_ROOT}/server/dist/index.js"],
	"cwd": "${PLUGIN_ROOT}"
}
```

Include the server and its dependencies in the package. `${PLUGIN_ROOT}` is a built-in placeholder.

## Rules

- Web and mobile cannot start stdio. The plugin shows a "Desktop only" badge, installs only from the desktop app, and `@` mentions work only in local threads.
- Local MCP submissions are limited to approved partners (organization allowlist).
- Everyone else submits skills only: portal option "Skills only" with a ZIP, and `requires_local_executor: true` in `extensions.com.openai`.
- Field note: the Secure MCP Tunnel sends `server/discover` before `initialize`. Use `createServer(...).connect(new StdioServerTransport())`, not `serveStdio`, so legacy `initialize` works.
- Field note: desktop extension APIs need ChatGPT desktop 26.928.20710 or later (`patterns.md L7`). Gate on host version.
- To offer both hosted and local, register two entries in `mcp.json` and state which tools need the desktop. A submitted plugin may connect only one MCP server (deploy/submission).
