# Creative reuse demos

Issues #43/#44 reuse existing Sealos service. No deployment, replacement renderer, Twitch action, or OBS control.

## Interface

`registerCreativeTools(server)` from `src/adapters/design/register.ts` registers five independent live tools. Parent server owns registration/UI integration.

| Tool | Input |
| --- | --- |
| `stream_machine_creative_list` | `{}` |
| `stream_machine_creative_project` | `{name,id}`; ID begins `stream-machine-` |
| `stream_machine_creative_start` | `{requestId,project,recipe,title?}`; recipe `overlay` or `video` |
| `stream_machine_creative_run` | `{requestId}` |
| `stream_machine_creative_artifact` | `{project,entry}` |

Overlay invokes installed `stream-overlay-authoring` with accepted camera-frame inputs, system fonts and GPT-6.1 Sol. Output offline HTML; no HyperFrames claim. Video invokes existing HyperFrames composition setup, edits its title/timeline, dispatches daemon `hyperframes-html` renderer, preserves returned task ID. Output three-second 1920×1080 silent MP4. Editable source stays under `.hyperframes-cache/<requestId>/`.

Server-only `STREAM_MACHINE_DESIGN_AUTHORIZATION` carries existing proxy authorization injected through fnox/1Password. Never supply credentials to tools, UI, repository, or `.env`. Endpoint fixed to existing deployment. Authenticated requests reject redirects. Errors omit raw provider responses.

Operation journal defaults to private `~/.local/state/stream-machine/creative.sqlite`; optional absolute `STREAM_MACHINE_CREATIVE_STATE_DIR` selects private location. Same UUID and inputs never submit again. Changed inputs with same UUID fail. Lost acknowledgment remains `unknown`; inspect existing project before consciously creating another operation. Do not delete journal to retry. Provider run also receives original UUID. HyperFrames submission has no documented provider idempotency key; journal reservation precedes scaffold/render.

Status polls returned run only; hosted HyperFrames skill follows original media task through `od media wait` and writes its task receipt. Completed video requires terminal successful render receipt. Existing project task-list API remains available for inspection of earlier direct media tasks. Cancellation unsupported in this slice; do not equate disconnect with cancellation.

Direct media integration trial exposed deployed MCP `write_file` normalization: `.hyperframes-cache` becomes `_hyperframes-cache`, leaving generated composition unchanged. Final recipe commissions installed HyperFrames skill to edit actual hidden source and use existing `od media scaffold` → `od media generate` → `od media wait`. No service change required. Media HTTP requests include deployment's configured Origin, as required by existing reverse proxy policy.

## Verification

November 1 read-only checks: authenticated `/api/health`200, version0.25.1; remote MCP tools/list22; projects, scenarios, skills, agents readable; integrated HyperFrames provider advertised. Configured desktop MCP points local signed app sidecar, explaining why its transport failure cannot establish Sealos outage.

Fresh isolated handoff/render verification recorded below after committed implementation. Historical accepted scenario evidence remains [reuse-evidence](../reuse-evidence.md).

Commands, with authorization already injected server-side:

```sh
mise exec -- bun scripts/creative-demo.ts list
mise exec -- bun scripts/creative-demo.ts project 'Stream Machine QA' stream-machine-qa-UNIQUE
mise exec -- bun scripts/creative-demo.ts start stream-machine-qa-UNIQUE overlay UUID
mise exec -- bun scripts/creative-demo.ts run UUID
mise exec -- bun scripts/creative-demo.ts artifact stream-machine-qa-UNIQUE ENTRY
```

Shared administrative connection remains single-tenant. Project ID selection does not establish multi-user authorization. Generated HTML/source is untrusted artifact text; tool never executes it.
