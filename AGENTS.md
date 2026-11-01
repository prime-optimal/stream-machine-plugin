# Work on Stream Machine

Use the private [stream-machine-plugin repository](https://github.com/prime-optimal/stream-machine-plugin) and the [Stream Machine project, #18](https://github.com/users/prime-optimal/projects/18). The project owner is `prime-optimal`.

Follow these development rules:

- Create an issue before implementation.
- Create branches from `main`.
- Use conventional commits.
- Apply `feat`, `fix`, or `chore`, one phase label, and one priority label. Phase labels are `phase:architecture`, `phase:build`, `phase:integration`, and `phase:release`. Priority labels are `priority:p0`, `priority:p1`, and `priority:p2`.
- Use the [implementation roadmap](docs/roadmap.md) for track ownership and completion dependencies. Start each implementation issue in its own worktree from `origin/main`.
- Build the smallest visible demo in the issue's Done when checklist. Extract shared helpers after working demos need them.
- Reuse TwitchCon's Twitch OAuth, the existing Sealos OpenDesign service, and OpenDesign's HyperFrames workflow before adding a replacement.
- Use mise for runtimes and tasks.
- Run `mise run install` to install dependencies.
- Use `mise run check` for TypeScript checks and `mise run test` for domain tests.
- Use `mise run smoke` to check the bundled server over stdio MCP.
- Use `mise run build` to build the server and UI.
- Use `mise run package` to create the plugin archive.
- Use Bun for JavaScript packages.
- Use uv for Python.
- Store secrets with fnox and 1Password. Never put credentials in source, logs, chat, or `.env` files.
- Keep each source file under 500 lines.
- Write artifacts under `docs/`.
- Keep mock data clearly marked and separate from real provider actions. Claim a real account connection or action only after verifying it.
- Connect local MCP hosts directly to desktop providers when needed. Treat a cloud-to-desktop bridge as separate work.
- Do not start or stop broadcasts during architecture work.
- Do not modify active Stream Deck profiles during architecture work.
- Do not automatically start third-party automations during architecture work.
- Delegate work that requires extensive reading.
- Assign each agent a separate set of files to edit. Do not overwrite another agent's changes.

Use the repository layout to locate changes:

- Edit `src/server.ts` and `src/stdio.ts` for the MCP server.
- Edit `src/domain.ts`, `src/catalog.ts`, and `src/preview.ts` for domain behavior, mock data, and the local preview.
- Edit `src/ui/` for the native UI.
- Edit `skills/` for plugin skills and `plugin.json` for the manifest.
- Consult `docs/architecture.md` and `docs/decisions.md` for design decisions.
