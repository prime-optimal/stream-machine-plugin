# Local navigation browser verification

Synthetic QA only. This check does not establish Work desktop, Work browser, OAuth, media playback, or provider connectivity.

## Results

Run on macOS with agent-browser 0.41.0 and HeadlessChrome 156.0.0.0. The fixture served the built app from this issue worktree at `http://127.0.0.1:4388/?preview=1`. It used only the mock domain and synthetic Twitch responses. Browser network access was restricted to `127.0.0.1`. No authorization link reached the real local OAuth listener.

The browser script exited 0 with 14 checks. [Structured observations](observations.json) record the assertions and synthetic tool request log.

- Home, Assets, Clips, Stream Deck, Connections, Tools, and Mock demo remain reachable.
- Navigation makes no tool requests. Each destination focuses its heading. Enter on the menu button also moves focus correctly.
- Assets, Stream Deck, and Twitch title input nodes and drafts survive navigation and Mock reset. A collapsed Mock disclosure stays collapsed after reset.
- A keyboard-initiated check focuses the status while pending, then restores the initiating button. A completion after leaving Connections does not steal the destination heading focus.
- An explicit Twitch check shows the synthetic authenticated account and missing-permission count. Exact missing grants remain in the disclosure. Failed refresh retains the account as stale.
- Reconnect invalidates a delayed status response. A returned connection URL leaves status Not checked.
- All seven destinations fit 375×812 without horizontal overflow.
- Clips states that gallery and playback are unavailable.
- An injected SDK link denial leaves the fixture page unchanged and presents the copy fallback. This is not a native-host test.
- The browser error log was empty.

## Screenshots

Each screenshot includes a synthetic-QA banner. Images contain no credentials or real account details.

| Image | View |
| --- | --- |
| [Home wide](home-wide.png) | 1440×900, five primary sections plus Tools and Mock demo |
| [Connections wide](connections-wide.png) | 1440×900, checked synthetic account with missing grants |
| [Connections narrow](connections-narrow.png) | 375×812, URL creation does not verify the account |
| [Clips narrow](clips-narrow.png) | 375×812, honest unavailable state |

## Reproduce

Build first:

```sh
mise run build
```

Start the synthetic server in a separate terminal:

```sh
mise exec -- bun docs/verification/88-local-navigation/serve.ts
```

Run the isolated browser and assertions:

```sh
AGENT_BROWSER_SESSION=issue88-synthetic-qa agent-browser --allowed-domains 127.0.0.1 open 'http://127.0.0.1:4388/?preview=1'
mise exec -- bun docs/verification/88-local-navigation/verify.ts
AGENT_BROWSER_SESSION=issue88-synthetic-qa agent-browser close
```

The expected result is `PASS 14 synthetic browser checks`, exit 0, and regenerated screenshots and observations. Stop the fixture with Ctrl-C in its terminal. Do not use the production preview command for this test.

## Process cleanup

The completed run used fixture PID 53241. Ctrl-C stopped it with exit 130. The named browser `issue88-synthetic-qa` closed with exit 0. No QA process remains.

The fixture imports `DemoWorkspace`, not the production server. Unknown provider tools return `FIXTURE_BLOCKED_ACTION`. The `/mode` endpoint changes synthetic test responses only. The isolated fallback page injects a denied link opener and never calls the host SDK.
