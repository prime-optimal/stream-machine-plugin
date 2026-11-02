# Stream Machine

Stream Machine provides hosted Twitch tools through its [ChatGPT Site](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site). Read your channel, preview a title change, and approve the exact title in your browser.

Hosted MCP is the default. The optional local fallback provides OBS, Stream Deck, HTML creative demos, a responsive MCP App, and an independent event-to-OBS worker. The fictional recipe sample remains separate from real actions.

The current build reuses TwitchCon OAuth, OBS alert HTML, the USB Stream Deck MCP server, and the existing OpenDesign service. HyperFrames output is HTML. Secrets stay in fnox and 1Password.

The project documentation covers these topics:

- [Run the working demos and inspect evidence](docs/demos/integration.md)
- [Use hosted Twitch tools or the local fallback](docs/hosted-mcp.md)
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
