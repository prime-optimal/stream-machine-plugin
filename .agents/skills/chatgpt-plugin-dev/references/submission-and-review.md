# Submission and review

Sources: https://developers.openai.com/plugins/deploy/submission, /deploy/app-review, /plugin-guidelines. `chatgpt-app-submission` generates `chatgpt-app-submission.json` (app info, 5 positive and 3 negative cases, hints). This file covers the rest.

## Portal steps

1. Verify the individual or business at platform.openai.com. You need Apps Management Write (`api.apps.write`).
2. Open platform.openai.com/plugins and upload the plugin ZIP.
3. Verify the MCP domain: serve a plain-text token at `/.well-known/openai-apps-challenge`.
4. Run Scan Tools. Fix flagged names, descriptions and annotations.
5. Enter 5 positive and 3 negative test cases, a demo video and reviewer credentials (no MFA).
6. Submit. Monitor status in the dashboard.

## Rules that surprise people

- Only one MCP server per plugin. The origin cannot change. A new origin means a new plugin.
- EU data residency projects cannot submit MCP.
- No non-empty `headers` in `mcp.json` on submission.
- With UI, set `_meta.ui.domain` (unique per plugin). `frameDomains` need a written justification (plugin-guidelines, Iframes).
- Review is continuous: daily scans, deleted tools disappear at once, new tools wait for checks, changed tools keep the old definition. The UI resource is cached up to 1 hour.
- Commerce: physical goods, external checkout. No digital goods, no ads, no upgrade links.
- Hooks plugins are not eligible for the public directory.

## Gaps in `chatgpt-app-submission`

- Writes `$schema` under `developers.openai.com/apps-sdk/schemas/...`. [unverified: still valid]
- Covers app info, tools and cases only. It does not cover domain verification, icons, the four HTTPS URLs, demo video, reviewer credentials, `extensions.com.openai.review`, or the ZIP.
- Category list is its own. [unverified: matches the portal]
- Its `openWorldHint` meaning differs from the guidelines (see `mcp-server-and-auth.md`).
