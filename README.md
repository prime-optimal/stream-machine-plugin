# Stream Machine Desktop

Stream Machine Desktop gives ChatGPT Twitch tools plus OBS and USB Stream Deck controls on your desktop. One install registers three MCP servers. Sign in through the [ChatGPT Site](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site) to read your channel, preview a title change, and approve the exact title in your browser.

The hosted `stream-machine` server provides Twitch, clips, and the Stream Machine menu. The local `stream-machine-obs` server provides 3 OBS tools. The local `stream-machine-streamdeck` server provides 6 Stream Deck tools that build a streamer layout from your OBS scenes. The other local tools are commented out in `src/server.ts` and not exposed. Their source modules and unit tests remain.

Web and mobile cannot start the local stdio server. On those hosts, install the Stream Machine Site plugin for Twitch. If you install both the Site plugin and this package on desktop, the Twitch tool names duplicate. Keep Twitch on the bundled `stream-machine` server.

## For judges

This repository is Stream Machine, an entry in the [Codex x TwitchCon Hackathon](https://twitchcon-codex.devpost.com/). The [Devpost answers](docs/submission/devpost.md) hold the description, the feature status with evidence links, and the disclosures. The [demo script](docs/submission/demo-script.md) lists what the video shows.

To install on the Codex desktop app:

1. Put Bun on `PATH`.
2. Download `stream-machine-<version>.zip` from the latest [release](https://github.com/prime-optimal/stream-machine-plugin/releases). GitHub asks you to sign in with an account that can read this repository.
3. Follow [Install on desktop](docs/setup.md#install-on-desktop). It unpacks the ZIP into a local plugin marketplace and runs `codex plugin add`. Do not upload the ZIP to your account with Plugin Creator, because an account upload also appears on web and mobile, where the local server cannot start.
4. Start a new conversation and ask Codex to connect your Twitch account. The first hosted tool call asks you to sign in through the Site and connect Twitch.

Requirements: Codex or ChatGPT desktop, Bun, and a Twitch account. OBS Studio 33 or later with its WebSocket server on `localhost:4455` is needed only for the OBS tools. An Elgato Stream Deck connected by USB is needed only for the Stream Deck tools.

| Host | Twitch tools and menu | OBS and Stream Deck tools |
| --- | --- | --- |
| Desktop | Hosted `stream-machine` server | Local `stream-machine-desktop` server |
| Web and mobile | Not verified. Install the Stream Machine Site plugin ([#140](https://github.com/prime-optimal/stream-machine-plugin/issues/140)). | Not available. The local server cannot start. |

Work in progress is not part of the entry: separate OBS and Stream Deck servers (#191, #192), OpenDesign graphics (#193), the redesigned menu (#194), and in-host clip playback (#195). See [the submission checklist](docs/submission/checklist.md) for the judging-access plan for this private repository.

The project documentation covers these topics:

- [Run the working demos and inspect evidence](docs/demos/integration.md)
- [Use hosted Twitch tools and the desktop fallback](docs/hosted-mcp.md)
- [Implementation roadmap and parallel work](docs/roadmap.md)
- [Run the demo and build the package](docs/setup.md)
- [Manage secrets and refresh the local cache](docs/secrets.md)
- [Use RepoPrompt context and delegated workflows](docs/repoprompt-workflow.md)
- [Commit and share a change](docs/git-workflow.md)
- [Package reference](docs/package-reference.md)
- [Architecture and embedded diagrams](docs/architecture.md#how-a-demo-request-moves)
- [Integration choices](docs/integrations.md)
- [Decisions and open questions](docs/decisions.md)
- [Prototype verification results](docs/verification.md)
- [Issue #1](https://github.com/prime-optimal/stream-machine-plugin/issues/1)
- [Stream Machine board](https://github.com/users/prime-optimal/projects/18)
