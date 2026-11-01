# Superseded renderer trial

Historical audit only. User corrected scope to editable/playable HTML. Do not deploy candidate or submit render jobs. Original Sealos image restored and healthy; no owned jobs pending. Upstream issue5 closed NOT_PLANNED. Isolated trial commits remain unmerged. Current implementation is [HTML-only](creative.md).

November 1, 2026. Read-only source/container inspection; no workload, image, authentication, container package, or runtime configuration changed.

## Confirmed cause

Sealos daemon0.25.1 runs standalone `node apps/daemon/dist/cli.js --no-open`. Its built-in HyperFrames integration chooses explicit daemon browser override or Electron desktop callback. Current process has neither. This is runtime packaging/configuration, not failed service authentication or missing skill discovery.

Source anchors in existing OpenDesign checkout, clean `main` at `2ee372ef51`:

- `apps/daemon/src/media/index.ts:3948`: `HYPERFRAMES_BROWSER_PATH` selects shipped daemon render implementation.
- `apps/daemon/src/media/index.ts:3965`: absent override and desktop callback throws exact fresh task failure.
- `apps/daemon/src/media/index.ts:4229`: daemon invokes its pinned bundled HyperFrames CLI and streams progress; same supported implementation remains available.
- `apps/daemon/src/sidecar/server.ts:121`: desktop callback requires running desktop sidecar advertising frame renderer.
- `packages/sidecar/src/json-ipc.ts:163`: sidecar transport is local Unix socket/named pipe. Opening remote browser UI or local desktop app does not register local Electron renderer with remote Sealos daemon.

Current image: `harbor.usw-1.sealos.io/ns-sjkkuwc0/stream-machine@sha256:a3aa28203c12996188a2e9ad9037392e1207e719ef33a708abaa8ed7dfc0b50b`.

Read-only pod inspection:

| Item | Result |
| --- | --- |
| Pod | `open-design-vflpam-0`, ready1 |
| Platform | Alpine3.24.3, x86_64 |
| Installed HyperFrames |0.8.1, package resolved from daemon dependencies |
| Bundled ffmpeg | Present at daemon dependency's `@ffmpeg-installer/linux-x64/ffmpeg` |
| Browser override | `HYPERFRAMES_BROWSER_PATH` unset; no renderer-related StatefulSet env entries |
| Browser executable | No `chrome`, `chromium`, `chromium-browser`, `headless_shell`, `chrome-headless-shell` under `/app`, `/usr`, `/opt`, `/home`, `/root`, `/tmp`, depth14; command lookup/cache checks also empty |
| APK package | `apk info -e chromium` absent |
| CLI support | Installed HyperFrames CLI explicitly reads `HYPERFRAMES_BROWSER_PATH`; built-in Chromium launch arguments present |

## Smallest concrete repair

No already-shipped browser executable exists, so environment-only repair cannot work. Use existing image as pinned base, add distribution Chromium runtime, and set `HYPERFRAMES_BROWSER_PATH` to executable verified during image build. Existing daemon, project sources, media task API, render implementation, ffmpeg, authentication and persisted data stay in place. No separate renderer/service.

[Official Alpine package index](https://pkgs.alpinelinux.org/packages?branch=v3.24&name=chromium) lists Chromium for existing v3.24 x86_64 platform. Exact package/executable and launch compatibility must be proved in candidate image before rollout; no browser path guessed as installed.

Concrete source work: dedicated issue/worktree in existing OpenDesign repository; derivative Dockerfile based on current immutable image, install `chromium` through APK, verify executable and version, set browser override. Commit source first. Build candidate, test bundled daemon render path with small existing composition in isolated project/data copy, then review minimal StatefulSet image replacement with saved prior image/config. Parent may authorize controlled existing-service rollout after checks. Do not install packages into running pod or restart before review.

This repair requires image/config change and controlled restart. Current investigation authorization covers read-only work; no rollout performed. Source checkout clean; creative adapter/evidence committed at `8982158` before investigation.

## Fresh task evidence

Installed HyperFrames skill did composition setup, minimal system-font edit, dispatch and original-task wait. Task `2a69c8a7-03ac-4923-b629-3dddc8f94d4f` failed because renderer unavailable. [Receipt](creative-artifacts/video-task.json), [editable source](creative-artifacts/video-source.html). No MP4 produced; playback acceptance pending repair.
