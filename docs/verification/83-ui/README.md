# Mocked Twitch consent UI verification

This proof renders the actual `createLiveDemos()` view and imports its current permission policy. It does not use the real MCP bridge or OAuth runtime.

## Result

Verified November 1, 2026 with Bun 1.4.4, agent-browser 0.41.0, and Headless Chrome 156.0.0.0 on macOS. The browser had a 1120 × 1800 viewport.

- **Check connection** returned a mock account with only `channel:manage:broadcast` granted. The card showed 11 missing permissions and `reconnectRequired: true`.
- The card distinguished two implemented permissions from ten future permissions. The expanded **Exact requested permissions** disclosure displayed all 12 exact names, Twitch's excess-scope policy conflict, possible suspension, and the separate-bot identity limit.
- **Connect or reconnect Twitch · 12 permissions** returned the mock connection link. The browser stayed at `http://127.0.0.1:48383/`. The link was not opened.
- Only `stream_machine_twitch_status` and `stream_machine_twitch_connect` were called, both through the in-page mock. Browser errors, captured page errors, and console output were empty.
- Screenshots contain a fictional account and no credentials or personal data. The screenshot crop shows the Twitch card. Test-only CSS hides unrelated cards and widens this card for readable evidence.
- The mock server and isolated browser were stopped after capture. Existing workers and browsers were untouched.

[Missing-grant screenshot](missing-grants.png) shows old-grant status. [Connection screenshot](connect-disclosure.png) shows the full disclosure and returned mock link. [Browser observations](observations.json) record the final text, expanded detail state, and calls.

## Reproduce

Run from the issue worktree:

```sh
bash docs/verification/83-ui/verify.sh
```

The script builds the actual UI with a fake `ToolRequest`, starts only a loopback server, captures both screenshots, checks the displayed state, and stops its own server and browser. It requires port 48383 to be free. It never opens the consent link.

The original capture commands and cleanup all exited 0. The final automated reproduction also exits 0 when its assertions hold. This is mocked disclosure evidence, not evidence that Twitch granted permissions or that future chat, reward, event, clip-creation, or bot features exist.
