# Creative HTML reuse demos

HyperFrames authors editable/playable browser HTML, following TwitchCon overlays. Sealos runs original image `a3aa28203c12996188a2e9ad9037392e1207e719ef33a708abaa8ed7dfc0b50b`. No renderer deployment or media job belongs to this workflow.

## Tools

`registerCreativeTools(server)` exports five live tools. Parent server owns registration and UI.

| Tool | Input |
| --- | --- |
| `stream_machine_creative_list` | `{}` |
| `stream_machine_creative_project` | `{name,id}`; ID starts `stream-machine-` |
| `stream_machine_creative_start` | `{requestId,project,recipe,title?}`; recipe `overlay` or `hyperframes-html` |
| `stream_machine_creative_run` | `{requestId}` |
| `stream_machine_creative_artifact` | `{project,entry}` |

Overlay invokes installed `stream-overlay-authoring`, preserving actual run ID and exact artifact entry. Fresh handoff succeeded with system fonts and requested GPT-6.1 Sol.

HyperFrames HTML uses a fixed system-font composition with a paused GSAP timeline. TwitchCon live driver is copied byte-for-byte from `overlays/live/driver.js`, SHA256 `94b01676edd95c0f47cf968ae5d17842a1a8300ee7c2fbbd2555c422683ccf5b`, at Stream Makeover revision `4e2bff85969550e3b2e94aed2fab7a6b8f2f62db`. Injection follows `overlays/scripts/build-overlay.mjs`. No private fonts or assets copied.

Existing OpenDesign MCP stores three versioned files under `creative-html/<requestId>/`: paused authoring `source.html`, source/provenance `source.json`, and playable `index.html`. Exact read-back is required before success. Playback fetches only pinned GSAP3.14.2 from jsDelivr. No HyperFrames CLI/runtime required.

Live controls match TwitchCon: `window.overlay.pause()`, `play()`, `replay()`, `update({title,primary})`, URL variables, default loop, and `?loop=0`. Title updates write text.

## Connection and retry contract

Server-only `STREAM_MACHINE_DESIGN_USERNAME` and `STREAM_MACHINE_DESIGN_PASSWORD` resolve through fnox/1Password. Adapter constructs Basic authorization in memory. Explicit `STREAM_MACHINE_DESIGN_AUTHORIZATION` overrides derived authorization. No credentials enter tool inputs, artifacts, logs, UI, or package. Existing administrative connection remains personal and single-tenant.

Private SQLite journal preserves UUID/hash duplicate protection. Same request never repeats writes. Lost acknowledgments remain unknown. Changed inputs with same UUID fail. Historical render records are privately backed up and retired as failed; they cannot trigger provider polling.

## Verification

Fresh installed overlay handoff: project `stream-machine-creative-20261101`, run `145dd920-d844-4961-b239-2322467e9ced`, entry `weekend-camera-v1/index.html`. [Offline HTML](creative-artifacts/overlay.html) and [browser screenshot](creative-artifacts/overlay-browser.png) preserve proof. Transparent body, no external scripts, no browser console errors. No new OBS verification.

Corrected HTML-only request `effe35e3-0bc9-4a5a-b97e-4c3021de3a2d` succeeded in isolated project `stream-machine-html-20261101`. [Actual stored playable HTML](creative-artifacts/hyperframes-html.html), [editable source](creative-artifacts/hyperframes-source.html), [provenance](creative-artifacts/hyperframes-provenance.json), and [service hashes](creative-artifacts/html-service-proof.json) preserve exact files. Read-back was complete, without truncation.

[Browser proof](creative-artifacts/html-browser-proof.json) records autoplay, default loop, stable pause, resumed play, replay, safe live updates, invalid-color rejection, URL variables, and single-play completion. Native Brave loaded the real retrieved file. Body remained transparent. Console showed zero errors and one expected invalid-color warning. [Screenshot](creative-artifacts/html-browser.png) shows a held visible frame. Temporary QA tab closed. OBS untouched.

TypeScript/build pass. Sixteen tests pass, including real in-memory MCP registration, credential derivation/override, HTML roundtrip, duplicate suppression, safe text, exact scenario provenance, and retired journal records. [Verification record](creative-artifacts/verification.json) links current proofs.

## Historical correction

Earlier MP4 interpretation was wrong. Trial image rolled back; original service health200, anonymousHTML401, authenticatedHTML200, MCP22tools, unchanged non-image configuration. No owned render tasks pending. Upstream runtime issue5 closed NOT_PLANNED. [Historical diagnosis](creative-renderer-repair.md) and failed receipts remain audit records, not operating instructions.
