# OpenAI MCP extensions

Source: https://github.com/openai/mcp-extensions/blob/main/docs/spec.md (`spec.md L<n>`), https://developers.openai.com/plugins/build/extensions. SDK: `@openai/mcp-extensions` (shared), `/server`, `/app`. Servers advertise capabilities in `capabilities.extensions` (protocol 2026-07-28, via `server/discover`) or `initialize` `capabilities.extensions` / legacy `experimental` (`spec.md L31-38`).

## Platform support (`spec.md L14-29`)

| Feature | Desktop | Web | iOS | Android |
| --- | --- | --- | --- | --- |
| Global entrypoint, thread entrypoint, display modes, onboarding, settings, message | yes | yes | yes | yes |
| Deep links | yes | yes | yes | no |
| File entrypoint, file resources, opening local files, WebMCP | yes | no | no | no |
| Composer mentions | yes | yes | no | no |
| Extended forms | yes | partial | no | no |
| Extended model context | yes | partial (no images) | partial | yes |

## Entrypoints (`spec.md L40-358`)

Add entries to tool `_meta["openai/ui"].entrypoints`. Up to three per app.

```json
{
	"name": "cad.library",
	"inputSchema": { "type": "object" },
	"_meta": {
		"ui": { "resourceUri": "ui://bits-and-bolts/library" },
		"openai/ui": { "entrypoints": [{ "type": "global" }] }
	}
}
```

- `{type:"global"}`: sidebar. `{type:"thread"}`: tab in a thread. `{type:"file", extensions:[".stl"]}`: file viewer, desktop only.
- Tool arguments are `{}` on open (file entrypoint gets `FileInput {file:{name, resourceUri}}`).
- `ui.visibility` is ignored when opened as an entrypoint.
- Title order: `title`, `annotations.title`, `name`. Icon order: tool `icons`, server icon (`serverInfo.icons`), generic.
- Prefer one tool per entrypoint (`patterns.md L155`).
- `quickAction {title, icons, target}` appears in the SDK README and the reference plugin, not in `spec.md`. [unverified in spec]
- File entrypoint: `hostCapabilities.experimental["openai/resource"]`. Read via `openaiExtensions.resources.read({uri})`, set `_meta["openai/resource"].representation` to `text` or `blob`, subscribe, and write with `ifMatch` etag. The host intercepts resource methods for these URIs (`spec.md L274-281, L386-421`).
- Icons: single-color stroke, transparent, 20x20 viewport, 1.33px stroke, light and dark files (`patterns.md L114-127`).

## Deep links (`spec.md L120-202`)

- Desktop `codex://plugins/{pluginId}@{marketplace}/app/{toolName}?path={encodedAppRelativePath}`. iOS `chatgpt://`. Web `https://chatgpt.com/plugins/<id>/app/<tool>?path=...`.
- Omit `@{marketplace}` for plugins published to ChatGPT. The path must start with `/` and have no fragment.
- The app reads `hostContext["openai/deepLink"].url` at init and on `ui/notifications/host-context-changed`. SDK: `openaiExtensions.deepLink.getCurrent()`.

## Structured settings (`spec.md L522-835`)

- Capability `openai/settings {readTool, updateTool}`. The server persists values. SDK: `extensions.settings.register({fields, layout, read, update})` before connect.
- Read tool: accepts `{}`, read-only, declares `outputSchema`, returns `values` for every field. Fields: boolean, string (enum), number, integer, plus tool actions. Unlisted fields fall into "Other settings".
- Update tool receives only changed properties. Keep secrets out of settings.

## Composer mentions (`spec.md L1329-1405`)

- Capability `openai/mentions {searchTool}`. The tool takes `{query}` (may be empty), returns `{items: ResourceLink[]}`, sets `readOnlyHint: true`, and includes `"app"` in `ui.visibility`. SDK: `mentions.setHandler`.
- Deprecated: `_meta["openai/extensions"]["mentions/search"]`.

## Model context (`spec.md L908-1135`)

- `ui/update-model-context` is idempotent per app instance. It replaces earlier context. Blocks: text, image, resource link, embedded resource. No audio.
- Visible context: put blocks in `content`. Background context: `structuredContent`, or text with `annotations.audience: ["assistant"]`.
- Optional block `_meta`: `openai/title`, `openai/thumbnail`, `openai/group {title}`. Block `_meta` is not sent to the model.
- Capability: `hostCapabilities.experimental["openai/modelContext"]`. Host state returns in `hostContext["openai/modelContext"]` after removals. SDK: `openaiExtensions.modelContext.update/getCurrent`.

## Messages (`spec.md L1143-1265`)

- `ui/message` accepts `_meta["openai/message"] {target:"active"|"new", send?:boolean}`. Default `{target:"active", send:true}`. `send:false` fills a draft.
- Gate on `hostCapabilities.experimental["openai/message"]`. iOS: no resource links. Titled text items are removable inline units; do not show them as selected.

## Opening local files (`spec.md L1268-1303`)

Gate on `hostCapabilities.experimental["openai/files"]`. `openaiExtensions.files.open(absolutePath)`. Desktop only.

## Forms and elicitation (`spec.md L1407-1945`)

- Protocol 2026-07-28 and later: use multi-round-trip (`requestFormInput`, `input_required`). Earlier: `openai/elicitation/create`. OpenAI-registered servers require MRTR (SDK README).
- Needs client capabilities `elicitation.form` and `extensions["openai/elicitation"].form`.
- Extensions to string and option schemas: `pattern`, option `description`, `x-openai-thumbnail` (HTTPS URL or data URI), `x-openai-suggestions`, `x-openai-input` (resource selection, `userOptions {kind, accept}`, option `_meta["openai/thumbnail"|"openai/preview"]`). Numbers return as JSON numbers.
- Web: no directory selection. Forms from MCP Apps support explicit selection only.

## Onboarding (`spec.md L882-906`)

Manifest `extensions["com.openai"].onboardingSkill`. See `chatgpt-plugin-dev`.

## WebMCP (`spec.md L1136-1141`)

Desktop only. Register tools with `document.modelContext?.registerTool({name, description, inputSchema, annotations, execute})` (`patterns.md L82-98`). `App.registerTool()` is not supported.
