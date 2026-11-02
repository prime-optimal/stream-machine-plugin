# Resources, visibility and CSP

Sources: https://developers.openai.com/plugins/build/chatgpt-ui, /reference, /plugin-guidelines. Prefer the MCP Apps key. The `openai/*` alias exists for compatibility.

| Purpose | Prefer | Alias |
| --- | --- | --- |
| Template link on a tool | `_meta.ui.resourceUri` | `openai/outputTemplate` |
| Who can call the tool | `_meta.ui.visibility` (default `["model","app"]`) | `openai/widgetAccessible` (default false), `openai/visibility` |
| Border | resource `_meta.ui.prefersBorder` | `openai/widgetPrefersBorder` |
| CSP | resource `_meta.ui.csp` `{connectDomains, resourceDomains, frameDomains}` | `openai/widgetCSP` (snake_case, plus `redirect_domains`) |
| Sandbox origin | resource `_meta.ui.domain` | `openai/widgetDomain` |

## Rules

- Resource MIME type: `text/html;profile=mcp-app` (SDK constant `RESOURCE_MIME_TYPE` from `@modelcontextprotocol/ext-apps/server`).
- Use `registerAppTool` and `registerAppResource` from the same package.
- `ui.domain` is required for submission with UI and must be unique per plugin. Default sandbox: `https://web-sandbox.oaiusercontent.com`.
- `redirect_domains` (legacy CSP) is required for `openExternal` redirects.
- Nested frames are blocked by default. `frameDomains` need a justification at submission and may slow review. Embeds are allowed from the server's own registrable domain (plugin-guidelines, Iframes).
- Field note: put every image, media and font origin in `resourceDomains`. Put API origins in `connectDomains`. Wildcards and unused domains get flagged by `chatgpt-app-submission`.
- Decoupled pattern: data tools return `structuredContent`. Only the render tool carries `resourceUri`.
- Version the resource URI (`ui://app/v2/...`) on breaking UI change. The resource is cached up to 1 hour after submission.
- Tool status strings: `openai/toolInvocation/invoking` and `/invoked`, 64 chars max.
- Hosts mirror locale to `document.documentElement.lang`. Use a `BrowserRouter` since navigation history is mirrored.
- Checkout: external by default. `requestCheckout` is private beta [unverified availability].
- Client hints in tool `_meta` (`openai/locale`, `openai/userLocation`, ...) are hints only.

## Display modes in resource metadata

On the resource content item, `_meta["openai/ui"]` takes `availableDisplayModes` and `preferredDisplayMode` (`spec.md L836-880`). The host can pick a mode before the app initializes. With both `inline` and `fullscreen` available, ChatGPT defaults to `fullscreen`. Without `openai/ui`, it defaults to `inline`. Entrypoints always open `fullscreen`.
