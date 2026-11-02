# Stream Machine Desktop

Stream Machine Desktop gives ChatGPT Twitch tools plus OBS and USB Stream Deck controls on your desktop. One install registers three MCP servers. Sign in through the [ChatGPT Site](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site) to read your channel, preview a title change, and approve the exact title in your browser.

The hosted `stream-machine` server provides Twitch, clips, and the Stream Machine menu. The local `stream-machine-obs` server provides 7 OBS tools that inspect scenes, show an alert, and create or remove scenes and browser sources. The local `stream-machine-streamdeck` server provides 6 Stream Deck tools that build a streamer layout from your OBS scenes. The other local tools are commented out in `src/server.ts` and not exposed. Their source modules and unit tests remain.

Web and mobile cannot start the local stdio server. On those hosts, install the Stream Machine Site plugin for Twitch. If you install both the Site plugin and this package on desktop, the Twitch tool names duplicate. Keep Twitch on the bundled `stream-machine` server.

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
