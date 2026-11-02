# Hosted menu verification (issue 157)

`serve.ts` serves `dist/app.html` with stubbed tools. It makes no Twitch requests and connects no account. Build first with `mise run build`, then start it:

```sh
mise exec -- bun docs/verification/157-hosted-menu/serve.ts
```

Open `http://127.0.0.1:4391/?preview=1`. Switch the runtime reported by `stream_machine_open` with `/scenario?value=hosted` or `/scenario?value=local`. `/observations` lists the tool calls the page made.

## Screenshots

| File | State |
| --- | --- |
| `hosted-home.png` | Hosted runtime: Home with the **Hosted** badge, the desktop note, and no Assets, Stream Deck, or Mock demo sections. |
| `hosted-connections-after-connect.png` | Hosted runtime after **Connect with Twitch**: the page called `stream_machine_twitch_connect` with no preflight and shows the Site link opened through the host. |
| `local-connections-site-link.png` | Desktop runtime: the Site link comes first and **Use desktop fallback** is collapsed. |

The stub account and tool results are synthetic.
