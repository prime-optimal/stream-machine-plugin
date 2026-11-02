# MCP server and auth

Sources: https://developers.openai.com/plugins/build/mcp-server, /build/auth, /reference, /plugin-guidelines. Tool planning and scaffolding belong to `build-chatgpt-app`.

## Server

- Server `instructions`: ChatGPT weighs the first 512 characters. Put routing guidance there.
- Tool result: `structuredContent` (model and UI), `content` (narration), `_meta` (UI only, hidden from the model).
- Company knowledge and deep research expect `search` and `fetch` tools (`build-chatgpt-app/references/search-fetch-standard.md`).
- Do not infer the chat log or ask for it. Do not return trace or request IDs unless needed (plugin-guidelines).
- Field note: accept unknown keys in `params` of every MCP method. ChatGPT sends `_meta` on `resources/read`. A strict schema gives -32602.

## Auth in `mcp.json`

`extensions["com.openai"].auth`:

| Key | Values |
| --- | --- |
| `type` | `none`, `oauth`, `mixed`, `api_key` |
| `client.mode` | `provided`, `dcr`, `cimd` |
| others | `tokenEndpointAuthMethod`, `authorizationUrl`, `tokenUrl`, `registrationUrl`, `baseScopes` |

- The submission portal does not support the `api_key` flow. Do not rely on it for public plugins.
- Never put a `clientSecret` in the manifest.

## OAuth server requirements

1. Serve protected resource metadata at `/.well-known/oauth-protected-resource`.
2. Answer unauthenticated calls with `401` and `WWW-Authenticate: Bearer resource_metadata="https://<host>/.well-known/oauth-protected-resource", scope="..."`. The well-known URL alone also works.
3. Require PKCE with S256. Echo the `resource` parameter.
4. Allow the redirect `https://chatgpt.com/connector_platform_oauth_redirect`. It is stable when your server supports the `iss` parameter. Otherwise allow `https://chatgpt.com/connector/oauth/{callback_id}`.
5. For CIMD, ChatGPT's client document is `https://chatgpt.com/oauth/client.json`.
6. Client-credentials grants are not supported.
7. mTLS: the certificate SAN is `mtls.prod.connectors.openai.com`.

## Per-tool auth prompt

Both halves are required to show the link UI:

1. Tool `securitySchemes`: `[{ "type": "noauth" }, { "type": "oauth2", "scopes": [...] }]`.
2. On failure, a result with `_meta["mcp/www_authenticate"]` that carries `error` and `error_description`.

## Profile tool

Mark one tool with `_meta["openai/profile"]: true`. Its `outputSchema` needs a required `id` and `additionalProperties: false`.

## Annotations

Meanings, from https://developers.openai.com/plugins/plugin-guidelines:

- `readOnlyHint`: true for retrieval, computation, previews. False for persisted artifacts, jobs, outbound messages.
- `destructiveHint`: false for read-only tools. True for deletes, overwrites, irreversible sends. Undo does not justify false.
- `openWorldHint`: true for public or open-ended targets. False for a bounded private account or catalog.
- Annotations never replace auth, scope checks or human confirmation.

Note: `chatgpt-app-submission` defines `openWorldHint` as "changes public or third-party state". The guidelines define it as "public or open-ended entities". Follow the guidelines.
