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
- Physical press verification pending user. Readback does not prove press behavior.

USB server resets display on connection. Existing hardware was blank. USB pages live under `~/.streamdeck-mcp/`; these are separate from Elgato profiles. Provider remains running for physical key callbacks. No generated scripts. Upstream executes fixed native command with parsed argv and `shell=False`.

## Runtime receipt

Installed native Homebrew `hidapi` 0.15.0 because Python provider initially reported missing `libhidapi.dylib`.

Unbounded upstream Python MCP dependency selected incompatible MCP v2. Adapter pins Python 3.11 and `mcp==1.25.0`.

Verified local source: `/Users/prime/Documents/ChatGPT/streamdeck-mcp-demo-reference` at revision above. Default source is same pinned fork revision through `uv tool run --from git+https://github.com/prime-optimal/streamdeck-mcp.git@<revision>`.

Initial keeper: exec session `66421`, provider PIDs `13711` and `13712`. Keeper has sole intended USB ownership. Parent must stop keeper before starting integrated USB demo. Do not run Elgato concurrently.

## API

`registerStreamDeckTools(server)` exported from `src/adapters/streamdeck/register.ts`. Returns workspace with async `close()` for host shutdown. No new JavaScript dependencies.

| Tool | Input | Effect |
| --- | --- | --- |
| `stream_machine_streamdeck_inventory` | `{}` | Enumerates USB metadata and saved USB pages. Does not connect or reset display. |
| `stream_machine_streamdeck_preview` | `{serial, key?: 0..14, url}` | Checks Original geometry, validates HTTP URL, returns expiring preview ID and exact action. No writes. |
| `stream_machine_streamdeck_apply` | `{previewId}` | Consumes preview once, claims USB, creates unique test page, writes one button, checks readback. |
| `stream_machine_streamdeck_release` | `{}` | Restores main page, deletes owned test page, disconnects provider. |

Preview lifetime: five minutes. Invalid positions, missing serial, non-Original geometry, non-HTTP URLs, reused previews, concurrent apply, and running Elgato app reject. Arbitrary commands unsupported. URL passed to fixed `/usr/bin/open` command.

## Run demo

Read inventory:

```sh
mise exec -- bun scripts/streamdeck-demo.ts inventory
```

Preview without writes:

```sh
mise exec -- bun scripts/streamdeck-demo.ts preview AL29G1A04274 https://github.com/users/prime-optimal/projects/18/views/1
```

After setup authorization, apply and retain keeper:

```sh
mise exec -- bun scripts/streamdeck-demo.ts apply AL29G1A04274 https://github.com/users/prime-optimal/projects/18/views/1
```

Local source override: `STREAM_MACHINE_STREAMDECK_SOURCE=/Users/prime/Documents/ChatGPT/streamdeck-mcp-demo-reference`.

Press top-left **OPEN DEMO**. Expected result: GitHub Project 18 opens in default browser. Keep process running. Ctrl-C removes owned page and releases USB. Abrupt termination can leave saved test page; provider restart does not resume it automatically.

## Checks and limits

`mise run check`: passed. `mise run test`: eight tests passed, including three Stream Deck tests. Tests cover read-only preview, key bounds, URL validation, single write, readback, one-shot preview, cleanup call, and command quoting.

Literal older issue criteria for native profile backup, configured action reuse, and native profile restoration remain inapplicable to fresh USB fallback. Existing native profiles were absent and unchanged. No claim of native profile verification or completed physical press.
