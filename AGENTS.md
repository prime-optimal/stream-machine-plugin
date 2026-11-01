# Stream Machine

- Repository: https://github.com/prime-optimal/stream-machine-plugin (private).
- GitHub Project: Stream Machine #18, owner prime-optimal.
- Labels: feat/fix/chore, phase:architecture, priority:p0–p2.
- Issue before implementation; branch from main; conventional commits.
- Runtime and tasks: mise; JavaScript packages: Bun; Python: uv.
- Secrets: fnox + 1Password. Never credentials in source, logs, chat, or .env.
- Keep source files under 500 lines. Write artifacts under docs/.
- Demo core is mock-only. Never imply real Twitch authorization or real channel changes.
- Local MCP hosts may connect directly to desktop providers. Cloud-to-desktop bridging is separate scope.
- Never start/stop broadcasts, modify active Stream Deck profiles, or auto-start third-party automations during architecture work.
- Delegate read-heavy inspection; assign disjoint edit scopes. Do not overwrite other agents' changes.
