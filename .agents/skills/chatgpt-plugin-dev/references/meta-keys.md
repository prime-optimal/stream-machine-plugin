# `_meta` keys and aliases

Sources: https://developers.openai.com/plugins/reference, /build/chatgpt-ui, /build/extensions; `spec.md` as noted. "Prefer" is the MCP Apps standard key when one exists.

## Tool `_meta`

| Key | Prefer | Notes |
| --- | --- | --- |
| `ui.resourceUri` | yes | UI template. Alias `openai/outputTemplate` |
| `ui.visibility` | yes | Default `["model","app"]`. Alias `openai/widgetAccessible` (default false) and `openai/visibility` (`public`/`private`) |
| `openai/toolInvocation/invoking`, `/invoked` | n/a | Status text, 64 chars max |
| `openai/fileParams` | n/a | Names file-object params. `download_url` and `file_id` required |
| `securitySchemes` | n/a | Per-tool auth, see `mcp-server-and-auth.md` |
| `openai/profile` | n/a | Profile tool marker |
| `openai/ui.entrypoints` | n/a | `global`, `thread`, `file` (`spec.md L40-300`) |

## Resource `_meta`

| Key | Prefer | Notes |
| --- | --- | --- |
| `ui.prefersBorder` | yes | Alias `openai/widgetPrefersBorder` |
| `ui.csp` `{connectDomains, resourceDomains, frameDomains}` | yes | Legacy `openai/widgetCSP` uses snake_case, and `redirect_domains` is required for `openExternal` |
| `ui.domain` | yes | Alias `openai/widgetDomain`. Required for submission with UI |
| `openai/ui` `{availableDisplayModes, preferredDisplayMode}` | yes | `spec.md L836-880`. Docs list `openai/ui.availableDisplayModes` with `pip`. Spec says no `pip` |
| `openai/widgetDescription` | n/a | Reduces redundant narration |

Resource MIME type: `text/html;profile=mcp-app`.

## Client-provided `_meta` (hints only)

`openai/locale`, `openai/userAgent`, `openai/userLocation`, `openai/subject`, `openai/session`, `openai/organization`, and `openai/widgetSessionId` from the host. Never trust them for authorization.

Do not invent keys. If a key is missing here, check the spec and the reference page, and mark it unverified.
