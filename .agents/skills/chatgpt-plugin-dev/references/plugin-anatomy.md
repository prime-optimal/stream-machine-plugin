# Plugin anatomy (what plugin-creator does not cover)

Source: https://developers.openai.com/plugins/build/plugins unless noted.

## Portable package

```text
my-plugin/
	plugin.json        # portable manifest, root
	mcp.json           # MCP server entries
	skills/            # optional
	assets/            # icons, logos
	.app.json          # optional, referenced from extensions.com.openai.apps
```

- `plugin.json` sets `$schema` to `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`.
- `mcp.json` entries use `type: "streamable-http"` or `"stdio"`, with `$schema` `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`.
- OpenAI settings live under `extensions.com.openai`: `interface`, `apps`, `hooks`, `onboardingSkill`, `review`, `publication`, `requires_local_executor`.
- `review`: `test_cases` (5 positive, 3 negative), `demo_recording_url`, `commerce`. `publication`: `countries`, `release_notes`, `translations`.
- Legacy `.codex-plugin/plugin.json` still loads as a fallback. An inline `extensions.com.openai` block replaces the overlay file. It does not merge.
- Plugins with hooks are not eligible for the public directory.

## Limits

| Field | Limit |
| --- | --- |
| Plugin name | 64 chars, lowercase kebab |
| `displayName` | 30 chars |
| `shortDescription` | 30 chars |
| `longDescription` | 4000 chars |
| `defaultPrompt` | 3 prompts, 128 chars each |
| Icons | PNG, JPEG, WebP or SVG, 5 MiB max, square, at least 48 px |
| Required HTTPS URLs for MCP review | website, support, privacy, terms |

Guidelines also bar names that end in "MCP", "MCP Server" or "Plugin", and subtitles that mention pricing (plugin-guidelines).

## Marketplace and install

- Repo marketplace: `.agents/plugins/marketplace.json`. Personal: `~/.agents/plugins/marketplace.json`. `plugin-creator` writes these.
- Installs land in `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`. A local install uses version `local`.
- Restart the desktop app after changing an installed plugin.

## Onboarding

`extensions["com.openai"].onboardingSkill` points at a packaged skill path. Setup runs it in a new conversation after install (`spec.md L882-906`, https://developers.openai.com/plugins/build/extensions).

## Conflicts

- `plugin-creator` manifest keys `mcpServers: "./.mcp.json"` and `apps` differ from the portable `mcp.json` layout. Check which loader your target reads. [unverified: whether both load in current Codex]
