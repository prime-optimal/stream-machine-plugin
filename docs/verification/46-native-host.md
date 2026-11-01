# Native host verification for #46

Verified on November 1, 2026, in the Codex desktop chat host on macOS. This record satisfies the native-view and harmless-action checks in [issue #46](https://github.com/prime-optimal/stream-machine-plugin/issues/46).

## Installed package and tools

The installed package manifest at `/Users/prime/.codex/plugins/cache/created-by-me-remote/stream-machine/0.2.0/plugin.json` declares `stream-machine` version `0.2.0`. The installed plugin supplied 27 tools to this chat. Tool discovery confirms availability, not successful execution of every provider action.

- `stream_machine_connect_demo`
- `stream_machine_creative_artifact`
- `stream_machine_creative_list`
- `stream_machine_creative_project`
- `stream_machine_creative_run`
- `stream_machine_creative_start`
- `stream_machine_list_recipes`
- `stream_machine_obs_list_scenes`
- `stream_machine_obs_preflight`
- `stream_machine_obs_show_alert`
- `stream_machine_open`
- `stream_machine_preview`
- `stream_machine_reset`
- `stream_machine_streamdeck_apply`
- `stream_machine_streamdeck_inventory`
- `stream_machine_streamdeck_preview`
- `stream_machine_streamdeck_release`
- `stream_machine_twitch_apply_title`
- `stream_machine_twitch_channel`
- `stream_machine_twitch_connect`
- `stream_machine_twitch_preview_title`
- `stream_machine_twitch_status`
- `stream_machine_worker_arm`
- `stream_machine_worker_pause`
- `stream_machine_worker_status`
- `stream_machine_worker_stop`
- `stream_machine_workspace`

## Native action and observed result

1. Called the installed `stream_machine_open` tool. The host opened a Stream Machine MCP App in this chat's side panel.
2. Selected the existing app through the `mcpapps` surface. The document showed the five live-demo sections and a collapsed mock sample.
3. Expanded **Mock preview · fictional account, no live changes**.
4. Clicked **Use demo Twitch account**. The view showed **Sample Streamer is ready to explore.**
5. Entered `Native host verification #46` in **Stream title** and selected **Street Fighter 6 (demo)**.
6. Clicked **Preview channel update**. The view displayed **Your next stream, prepared.**, **Mock preview**, the proposed title, and the selected category.
7. Confirmed the visible result said that the preview performs no Twitch requests and cannot be executed.

These clicks used the native MCP App document and its server-tool transport. No loopback browser preview was started. The screenshot and DOM record show the completed native action:

- [Native mock preview screenshot](46-native-host/mock-preview.png)
- [Native view DOM record](46-native-host/native-view.txt)

The screenshot captures the visible document only. It includes the proposed title, category, preview button, and execution limit. It does not include the desktop sidebar.

The mock sample remains connected in this plugin process. No reset was requested. The fictional preview is not a real Twitch account connection or title update.

## Host limits and untested features

Native app-shell inspection through computer use was denied for `com.openai.codex`. The sidebar launch click and plugin version shown in app settings were therefore not inspected. The user reported that the installed plugin was already available in the sidebar. The installed cache manifest supplies version evidence.

The MCP App surface supports document screenshots, but rejected a full-page screenshot request. The visible-document capture succeeded. Native rendering and button-to-server calls worked in the opened side-panel view.

Fullscreen preference, the separate `stream_machine_workspace` thread entrypoint, model-context updates, mobile hosts, and web hosts were not tested. No unsupported result is inferred for those features.

Real Twitch, OBS, USB Stream Deck, creative generation, and event-worker actions were outside this harmless check. Their controls were visible, but no live mutation control was clicked.

## Verification scope

This change records installed-host evidence only. No source, packaged skill, manifest, statechart, or plugin installation changed. Existing mock lifecycle tests and the stdio smoke test are separate from the native-host evidence above.

## Local checks and retained work

The unchanged source passed `mise run check`, `mise run test` with 69 passing tests, and `mise run smoke` with 27 tools and the UI resource. `mise run hooks:check` passed after correcting Markdown heading links in the review.

An initial `mise run check test` invocation passed `test` as a TypeScript argument and failed. Running the two tasks separately passed. The first documentation check also caught two line fragments used as Markdown heading links. The corrected links passed.

At the pre-commit inspection, the primary checkout was clean on current `main`. The retained `/private/tmp/stream-machine-secrets` worktree on `codex/70-secrets-repoprompt` and `/Users/prime/Documents/ChatGPT/stream-machine-demo` on `codex/49-demo-integration` were clean, each one commit behind its upstream, with no local-only commits. Their existing task owners retain control of those worktrees.

PID 91601 runs `stream-machine-demo/src/worker/main.ts`. Its owner is the existing #49 demo session. Leave it running; that owner decides when to stop it. Installed version 0.2.0 server processes also remain host-owned. Their source paths point into the installed plugin cache. This task started no persistent server or worker.
