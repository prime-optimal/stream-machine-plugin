---
name: chatgpt-plugin-dev
description: "Use when building or shipping a ChatGPT/Codex MCP plugin: plugin.json, mcp.json, OAuth, connecting to ChatGPT, Secure MCP Tunnel, desktop-only stdio, review. Overlay on the official OpenAI skills."
---

# ChatGPT plugin development (overlay)

Official OpenAI skills (github.com/openai/plugins) are installed next to this one. Use them for the work they do. This skill adds what they miss or get wrong against the current docs at `https://developers.openai.com/plugins/` (fetched 2026-11-02). For in-chat UI, also load `chatgpt-plugin-ui`.

## Which skill for what

| Task | Use | Then apply from this skill |
| --- | --- | --- |
| Set up the MCP server and widget, tool plan, archetype | `build-chatgpt-app` | URL map, auth, annotations, `references/meta-keys.md` |
| Plugin folder, manifest, marketplace entry | `plugin-creator` (not vendored: upstream has no license; install globally with `skills add openai/plugins --full-depth -g -a universal -s plugin-creator`) | Portable layout and `mcp.json`: `references/plugin-anatomy.md` |
| Connect, test, refresh | none | `references/connect-and-test.md` |
| Local stdio plugin | none | `references/desktop-only.md` |
| `chatgpt-app-submission.json` | `chatgpt-app-submission` | `references/submission-and-review.md` (portal, scans, gaps) |
| Quality and score | `evaluate-plugin`, `evaluate-skill`, `improve-skill` | Run after the package builds |
| Rendered UI QA | `frontend-testing-debugging` | `chatgpt-plugin-ui` screenshot procedure |

## Where the official skills are stale

1. **Docs moved.** `build-chatgpt-app` fetches `developers.openai.com/apps-sdk/...`. Fetch `developers.openai.com/plugins/...` instead (`build/plugins`, `build/mcp-server`, `build/auth`, `build/chatgpt-ui`, `reference`, `deploy/*`). [unverified: whether `apps-sdk/` URLs still redirect]
2. **Manifest layout.** `plugin-creator` writes `.codex-plugin/plugin.json` and `.mcp.json`. The docs prefer a root `plugin.json` with `mcp.json`, and treat `.codex-plugin/plugin.json` as a legacy fallback. (build/plugins)
3. **Connect flow.** `build-chatgpt-app` says Settings, Apps & Connectors, Advanced, Developer Mode, ngrok. The docs say `chatgpt.com/plugins`, add a custom MCP server, create it as a plugin. (deploy/connect-chatgpt)
4. **Annotation justifications.** `chatgpt-app-submission` writes per-tool justifications. The guidelines say they are no longer required, and justifications cannot override a flagged annotation. Keep the JSON, drop the effort. (plugin-guidelines, deploy/submission)
5. **Bridge priority.** `build-chatgpt-app` teaches `window.openai` as the documented surface. The docs prefer the MCP Apps standard with `window.openai` as an alias. See `chatgpt-plugin-ui`.
6. **Pip.** The official reference lists `pip` display mode. The extensions spec says ChatGPT does not support `pip` (`spec.md L858`). See `chatgpt-plugin-ui`.
7. **Stdio entry.** The SDK README uses `serveStdio` (`typescript/README.md L33-46`). The tunnel field note below says it breaks.

## Rules

- Every tool sets `readOnlyHint`, `destructiveHint`, `openWorldHint` as explicit booleans, and declares `outputSchema`. (plugin-guidelines; `chatgpt-app-submission` warns on a missing schema)
- A plugin connects one MCP server. The origin cannot change after submission. (deploy/submission)
- No client secret in manifests. No non-empty `headers` on submission. (build/auth, deploy/submission)
- Never rename or reshape a shipped tool. Version the UI resource URI on a breaking UI change. (build/mcp-server)
- After any metadata change: Refresh the plugin, then start a new conversation. (deploy/connect-chatgpt)
- Test locally with the MCP Inspector first: `npx @modelcontextprotocol/inspector`.
- The Secure MCP Tunnel is for testing only, not public submission. (build/mcp-server)

## Field notes (verified in a real plugin)

- ChatGPT adds keys such as `_meta` to `params` on `resources/read` and other requests. A handler that validates `params` with a strict schema returns -32602, and the widget shows "Couldn't display <app>". Accept unknown keys.
- The Secure MCP Tunnel sends `server/discover` before `initialize`. A stdio server must still accept legacy `initialize`. Use `createServer(...).connect(new StdioServerTransport())`, not `serveStdio`.
- Desktop-only extension APIs need ChatGPT desktop 26.928.20710 or later.

## Reference map

| File | Read it for |
| --- | --- |
| `references/plugin-anatomy.md` | Portable package, `extensions.com.openai`, limits, marketplace, install cache |
| `references/mcp-server-and-auth.md` | Server instructions, results, OAuth and per-tool auth, profile tool |
| `references/connect-and-test.md` | Connect steps, Inspector, tunnel, API Playground, eval sets |
| `references/desktop-only.md` | Local stdio entry, allowlist, skills-only path |
| `references/submission-and-review.md` | Portal, domain check, scans, what the official skill omits |
| `references/meta-keys.md` | `_meta` keys and aliases, prefer or avoid |

## Keep this skill current

Sources (fetched 2026-11-02 with `defuddle parse <url> --md`): `build/plugins`, `build/mcp-server`, `build/auth`, `build/extensions`, `build/chatgpt-ui`, `reference`, `concepts/ui-guidelines`, `deploy/submission`, `deploy/app-review`, `deploy/connect-chatgpt`, `deploy/desktop-only`, `plugin-guidelines` under `https://developers.openai.com/plugins/`; official skills from https://github.com/openai/plugins and https://github.com/openai/skills, vendored next to this skill and recorded in the repository's `skills-lock.json`; `openai/mcp-extensions` `docs/spec.md`. Refresh: update the official skills with `skills update -p`, re-fetch the pages, compare them with each claim in the matching reference file, and re-check the stale list above.
