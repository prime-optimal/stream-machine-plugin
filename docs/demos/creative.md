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

Fresh isolated project: `stream-machine-creative-20261101`. Historical accepted scenario evidence remains [reuse-evidence](../reuse-evidence.md).

| Check | Fresh result |
| --- | --- |
| Installed overlay handoff | Run `145dd920-d844-4961-b239-2322467e9ced` succeeded; request `a4c409ba-724f-46d3-a601-2b97d2d3007f`. |
| Artifact retrieval | `weekend-camera-v1/index.html` retrieved through public adapter; no truncation. Editable `source.json` retained remotely. |
| Local browser | Title, aperture, copy visible; transparent body; no external scripts or browser console warnings/errors. [Screenshot](creative-artifacts/overlay-browser.png), [offline HTML](creative-artifacts/overlay.html). No new OBS verification. |
| HyperFrames handoff | Run `fb7a3a55-e891-4dcd-a12e-40cafe6da99d` followed task `2a69c8a7-03ac-4923-b629-3dddc8f94d4f` to failure, without resubmission. |
| Render result | Existing Sealos runtime reports desktop frame renderer unavailable. MP4 absent; dimensions/duration/frames/playback unverified. [Exact receipt](creative-artifacts/video-task.json), [editable source](creative-artifacts/video-source.html). |
| Status truthfulness | Outer authoring run reported succeeded despite failed render. Adapter reads render receipt, returns failed with `RENDERER_UNAVAILABLE`, does not return MP4 as available artifact. |
| Local checks | TypeScript/build pass; thirteen tests pass, including duplicate suppression, failed render receipt, invalid recipe/input, Origin policy and unusable localhost delivery URL. |

Issue #43 has fresh connection/handoff/artifact proof. Issue #44 remains incomplete: existing renderer unavailable. No successful video or installed HyperFrames package version claim. Existing source `apps/daemon/src/media/index.ts:3948–3965` has explicit `HYPERFRAMES_BROWSER_PATH` daemon override; absent that override and desktop registration, it throws recorded error. Runtime/config investigation must precede any proposed change.

Commands, with authorization already injected server-side:

```sh
mise exec -- bun scripts/creative-demo.ts list
mise exec -- bun scripts/creative-demo.ts project 'Stream Machine QA' stream-machine-qa-UNIQUE
mise exec -- bun scripts/creative-demo.ts start stream-machine-qa-UNIQUE overlay UUID
mise exec -- bun scripts/creative-demo.ts run UUID
mise exec -- bun scripts/creative-demo.ts artifact stream-machine-qa-UNIQUE ENTRY
```

Shared administrative connection remains single-tenant. Project ID selection does not establish multi-user authorization. Generated HTML/source is untrusted artifact text; tool never executes it.
