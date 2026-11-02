---
name: chatgpt-plugin-ui
description: "Use when building ChatGPT plugin UI beyond basics: OpenAI MCP extensions, entrypoints, settings, mentions, forms, model context, ui/message, deep links, display modes, CSP, host styles."
---

# ChatGPT plugin UI (overlay)

Load `chatgpt-plugin-dev` too. It owns manifest, server, auth, connect and submission. The official `build-chatgpt-app` skill owns widget basics: project setup, tool/render split, `structuredContent` vs `_meta`, and `references/window-openai-patterns.md` and `interactive-state-sync-patterns.md`. This skill adds only what they lack. Docs fetched 2026-11-02 from `https://developers.openai.com/plugins/`; the extension spec is https://github.com/openai/mcp-extensions/blob/main/docs/spec.md (`spec.md L<n>`), patterns in `docs/patterns.md`, SDK in `typescript/`.

## Where the official skill conflicts with current docs

- **Bridge priority.** `build-chatgpt-app` tells you to teach `window.openai.*` as the documented surface and treat `app.*` as wrapper detail. The current docs prefer the MCP Apps standard (`_meta.ui.*`, `ui/*` notifications, `tools/call`, `ui/message`) and list `window.openai` as an alias layer. Build on `@modelcontextprotocol/ext-apps` `App`; use `window.openai` only for features with no standard equivalent (files, modal, `setWidgetState`). (build/chatgpt-ui)
- **Pip.** `window-openai-patterns.md` lists `pip`. `spec.md L858` says ChatGPT supports only `inline` and `fullscreen`. Do not rely on `pip`. [unverified in host]
- **Docs URLs.** Its docs workflow uses `apps-sdk/...`. Use `plugins/...`.
- **Required metadata.** It says always set `openai/widgetDescription`. The docs list it as optional. (build/chatgpt-ui)

## Procedure

1. Set up the app with `build-chatgpt-app`. Expect an MCP server with a `ui://` resource and a render tool.
2. Set resource metadata and CSP: `references/resources-and-csp.md`.
3. Add extensions one at a time (entrypoint, settings, mentions, forms, model context, message, deep link): `references/extensions.md`. Check that every key appears in the spec or SDK source. If not, test in the host and mark it unverified.
4. Apply host styles, safe areas, display modes, caching, version gate: `references/design-and-verification.md`.
5. Verify in a real host with the screenshot procedure in that file.

## Rules

- Feature-detect with host capabilities (`app.getHostCapabilities()`), never by host name.
- Register `app.ontoolresult` (and `toolinput`) before `app.connect()`, or the first result is missed and the app flickers on a second call. (`typescript/README.md L63`)
- Use host variables and `@openai/mcp-extensions/app/styles.css`. Bundle or inline the CSS, since the default CSP can block external stylesheets. (`typescript/README.md L117`)
- Request a display mode only in response to a user action. Do not add display-mode buttons; ChatGPT provides them. (`patterns.md L29`)
- Prefer `fullscreen` for apps that stay open across turns. Use `inline` for brief interactions. (`patterns.md L33`)
- Give each entrypoint its own tool. Tool arguments are `{}` on open, so the tool must accept `{}`. (`spec.md L85, L212`)
- ChatGPT caches the icon and the HTML resource. It does not cache tool results, so persist them yourself and revalidate. (`patterns.md L129-153`)
- Declare every image, font, media and API origin in the CSP. No external fonts. No custom logos in responses.
- Avoid `localStorage` for state that must sync with the conversation. Use `setWidgetState` or model context. (build/chatgpt-ui) The caching pattern above is a separate use.

## Field notes (verified in a real plugin)

- Widget images and media need their origins in CSP `resourceDomains`, or they do not load.
- Enable `App.sendMessage` only when the host advertises the `message` capability. With the SDK, use `openaiExtensions.message`, which is undefined otherwise.
- Desktop extension APIs need ChatGPT desktop 26.928.20710 or later. Check at open from any entrypoint and show an update message. (`patterns.md L7`)
- If the widget shows "Couldn't display <app>", suspect a strict `params` schema on `resources/read` (-32602). ChatGPT adds `_meta`. See `chatgpt-plugin-dev`.

## Reference map

| File | Read it for |
| --- | --- |
| `references/resources-and-csp.md` | Resource MIME, `_meta.ui`, visibility, CSP, domain, aliases |
| `references/extensions.md` | Entrypoints, settings, mentions, forms, model context, message, deep links, files, WebMCP, platform table |
| `references/design-and-verification.md` | UI guidelines, styles, safe areas, sizes, caching, version gate, screenshots |

## Keep this skill current

Sources (fetched 2026-11-02): `build/chatgpt-ui`, `build/extensions`, `reference`, `concepts/ui-guidelines`, `plugin-guidelines` under `https://developers.openai.com/plugins/`; `openai/mcp-extensions` `docs/spec.md`, `docs/patterns.md`, `typescript/README.md`; `openai/plugins` skill `build-chatgpt-app`. Refresh: re-fetch with `defuddle parse <url> --md`, re-read the spec headings, compare them with each claim in the matching reference, and update it.
