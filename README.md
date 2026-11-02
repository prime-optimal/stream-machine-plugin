# Stream Machine Desktop

Stream Machine Desktop gives ChatGPT OBS and USB Stream Deck controls for your desktop. It is an add-on. Twitch, clips, and the Stream Machine menu come from the Stream Machine Site plugin, which installs on desktop, web, and mobile. Sign in through the [ChatGPT Site](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site) to read your channel, preview a title change, and approve the exact title in your browser.

This package registers one server, `stream-machine-desktop`, with 7 tools: three OBS tools and four Stream Deck tools. The other tools are commented out in `src/server.ts` and not exposed. Their source modules and unit tests remain.

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
