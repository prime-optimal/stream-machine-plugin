# Stream Deck demo evidence

2026-11-01. Issues #31, #32, #33. Fresh-device USB fallback authorized by user.

## Live result

- Device: Elgato Stream Deck Original, serial `AL29G1A04274`, 15 keys, 3 rows × 5 columns.
- Elgato desktop app and native profile directory absent. No existing configured native action available.
- Reused [streamdeck-mcp](https://github.com/prime-optimal/streamdeck-mcp), commit `dd3e58da3199d0e1de8d6f43cb7595e54cfa5f76`, version `0.3.0`, MIT. No upstream code copied.
- Used upstream `streamdeck-mcp-usb` MCP server. No custom HID implementation, Elgato profile writer, OBS, or Twitch changes.
- Inventory returned duplicate HID interfaces for same serial. Adapter deduplicates serial.
- Wrote dedicated USB page `sm-demo-5bae6af4-b245-46d7-b0e3-3b63588e8d52`.
- Top-left key: `OPEN DEMO`. Action: `/usr/bin/open 'https://github.com/users/prime-optimal/projects/18/views/1'`.
- Upstream `streamdeck_get_button` confirmed exact label and action after physical device write.
- User physically pressed top-left **OPEN DEMO** and confirmed GitHub board opened. Physical action verified by user confirmation, separate from provider read-back.

USB server resets display on connection. Existing hardware was blank. USB pages live under `~/.streamdeck-mcp/`; these are separate from Elgato profiles. Provider remains running for physical key callbacks. No generated scripts. Upstream executes fixed native command with parsed argv and `shell=False`.

## Runtime receipt

Installed native Homebrew `hidapi` 0.15.0 because Python provider initially reported missing `libhidapi.dylib`.

Unbounded upstream Python MCP dependency selected incompatible MCP v2. Adapter pins Python 3.11 and `mcp==1.25.0`.

Verified local source: `/Users/prime/Documents/ChatGPT/streamdeck-mcp-demo-reference` at revision above. Default source is same pinned fork revision through `uv tool run --from git+https://github.com/prime-optimal/streamdeck-mcp.git@<revision>`.

Initial keeper used exec session `66421`, provider PIDs `13711` and `13712`. Keeper stopped before integrated demo ownership. Group SIGINT terminated child before graceful page cleanup. Removed only owned saved page through upstream `streamdeck_delete_page`; no USB connection required. Inventory then returned only blank `main`. Do not run Elgato concurrently.

Default pinned Git source verified twice with `mise exec -- bun scripts/streamdeck-demo.ts inventory`, without local source override. Device and blank main page returned successfully. Earlier integrated inventory failure did not reproduce with same SDK inherited environment. Root cause remains unproven. Provider now retains last 4,000 diagnostic characters and includes them in transport failures. Tool errors include structured `error.code` and `error.message` for UI display.

## API

`registerStreamDeckTools(server)` is exported from `src/adapters/streamdeck/register.ts`. It returns a workspace with an async `close()` for host shutdown. The `stream-machine-streamdeck` server in `mcp.json` runs `bun ${PLUGIN_ROOT}/dist/server.js` and exposes these 6 tools. The server releases the deck when stdin closes or on SIGINT or SIGTERM.

| Tool | Input | Effect |
| --- | --- | --- |
| `stream_machine_streamdeck_inventory` | `{}` | Lists USB devices and saved USB pages. Does not claim the deck or reset the display. |
| `stream_machine_streamdeck_layout_preview` | `{serial, channel?, scenes?}` | Builds a one-page streamer layout for the Original 3×5 deck. Reads OBS and writes nothing to the deck. The preview expires after 5 minutes. |
| `stream_machine_streamdeck_layout_apply` | `{previewId}` | Consumes the preview once. Refuses while the Elgato Stream Deck app runs. Claims USB, creates or reuses the USB page `stream-machine`, clears it, writes the buttons, and reads back each button's label and command. |
| `stream_machine_streamdeck_button_update` | `{key, label?, action}` | Sets one key (0 to 14) after a layout is applied in this server process. `action` is `{type:"scene",scene}`, `{type:"mic"}`, `{type:"desktop-audio"}`, `{type:"record"}`, `{type:"stream"}`, or `{type:"url",url}` (HTTP or HTTPS only). Verified by read-back. |
| `stream_machine_streamdeck_button_clear` | `{key}` | Clears one key and verifies it is empty. |
| `stream_machine_streamdeck_release` | `{deleteLayout?}` | Disconnects and resets the deck. With `deleteLayout: true`, also deletes the `stream-machine` page. |

### Layout

| Keys | Buttons |
| --- | --- |
| 0 to 4 | One button per OBS scene, up to 5. Each shows an OBS screenshot of its scene, saved under `~/.stream-machine/streamdeck/`. `scenes` picks scene names in order. The default is the first 5 scenes in OBS order. |
| 5, 6 | MIC toggles mute on OBS input `mic1`. DESK AUDIO toggles mute on `desktop1`. |
| 8, 9 | REC toggles recording. GO LIVE toggles streaming. |
| 10 | STREAM MGR opens the Twitch stream manager. |
| 11, 12, 14 | With `channel` (a Twitch login): CHAT popout, ACTIVITY feed popout, and MY CHANNEL. |

GO LIVE starts or stops a real stream when pressed.

### Press commands

Button presses run fixed commands with no shell. OBS buttons run `bun dist/streamdeck-action.js <scene NAME|mic|desktop-audio|record|stream>`, which connects to OBS WebSocket at `ws://localhost:4455`. Authentication is not supported, so turn off the OBS WebSocket password. URL buttons run `/usr/bin/open URL`. The server process must keep running for presses to work. Arbitrary commands are unsupported.

## Run demo

Read inventory:

```sh
mise exec -- bun scripts/streamdeck-demo.ts inventory
```

Preview without writes. The channel is a Twitch login or `-` to skip it. Scene names after it are optional:

```sh
mise exec -- bun scripts/streamdeck-demo.ts preview AL29G1A04274 - "Stream Machine Wicked - Starting"
```

After setup authorization, apply and keep the process running:

```sh
mise exec -- bun scripts/streamdeck-demo.ts apply AL29G1A04274 - "Stream Machine Wicked - Starting"
```

Local source override: `STREAM_MACHINE_STREAMDECK_SOURCE=/Users/prime/Documents/ChatGPT/streamdeck-mcp-demo-reference`.

Press a scene key. Expected result: OBS switches its program scene. Keep the process running. Prefer `stream_machine_streamdeck_release` for graceful cleanup. Process-group termination can kill the child before cleanup and leave the saved page; provider restart does not resume it automatically.

## Hardware verification

2026-11-02. Deck `AL29G1A04274` (Stream Deck Original). OBS scenes: "Stream Machine Wicked - Starting", "Stream Machine Wicked - Live", and "Stream Machine Wicked - BRB".

- Apply read-back passed for 8 buttons.
- Running the stored key 0 and key 1 commands switched the OBS program scene.
- Physical press: pending user confirmation.

## Checks and limits

`mise run check`: passed. Initial full test run: eight tests passed. Follow-up Stream Deck tests: four passed. Tests cover structured provider errors, read-only preview, key bounds, URL validation, single write, read-back, one-shot preview, cleanup call, and command quoting.

Literal older issue criteria for native profile backup, configured action reuse, and native profile restoration remain inapplicable to fresh USB fallback. Existing native profiles were absent and unchanged. Native profile verification remains outside this USB result.
