# Prototype verification results

These results record the prototype checks from 2026-11-01 in the America/Los_Angeles time zone. The prototype is preserved in commit `e6c7ff1`. The results do not describe later installation or deployment changes.

Repository: https://github.com/prime-optimal/stream-machine-plugin

The repository belongs to the Stream Machine project, #18, owned by `prime-optimal`.

The work is tracked in [issue #1](https://github.com/prime-optimal/stream-machine-plugin/issues/1) on branch `codex/1-plugin-architecture`.

## Verified implementation

The tested prototype contains these components:

- A portable plugin manifest and a stdio MCP configuration.
- Onboarding and recipe-preview skills.
- Six typed tools, metadata for global and thread entrypoints, and a bundled MCP App resource.
- A demo account stored in the server process, explicit capability status, and one working preview recipe.
- Two disabled recipes whose providers are not implemented.
- A separate browser preview bound to loopback, with no live provider actions.

## Checks

| Check | Result |
|---|---|
| TypeScript, `mise run check` | Passed. |
| Domain tests, `mise run test` | Five tests passed with 15 assertions. |
| Bundled stdio, `mise run smoke` | Discovered six tools. The disconnected preview rejection, demo connection, preview, UI resource, and reset checks passed. |
| Archive validation, `mise run package` | Parsed the manifest JSON and skill YAML. Inspected archive entries contained no dependency directory, secrets, or configuration cache. |
| Extracted archive | The MCP smoke test passed from a temporary directory outside the checkout without `node_modules`. |
| Browser workflow | The fictional Sample Streamer account connected. The preview matched the entered title and category. Reset disabled the form. |
| Browser console | No warnings or errors appeared during the tested workflow. |
| Responsive layout | The page had no horizontal overflow at measured CSS viewports of 375×811, 767×1024, and 1440×900. |
| Source review | A separate read-only review covered the domain, MCP registration, preview server, build, and package scripts. The review found no actionable issues. |
| Source file length | Each source file had fewer than 500 lines. The count command is `wc -l src/*.ts src/ui/* scripts/*.ts`. |

The viewport settings accounted for the host's zoom level. The table records measured CSS dimensions. The screenshot used an explicit capture region because the host cropped full-page captures.

![Mock channel preview](screenshots/mock-preview-desktop.jpg)

## Related files

The following files describe the prototype and its review:

- [Architecture](architecture.md)
- [Integration inventory](integrations.md)
- [Accepted and deferred decisions](decisions.md)
- [Run the demo and build the package](setup.md)
- [Package reference](package-reference.md), including the archive path and regeneration task.

## Verification limits

At the time of these checks, the package had not been uploaded or installed into a host. Protocol checks verified the native view metadata and resource. They did not verify rendering in a native host.

The prototype had no hosted endpoint, multi-user authentication, persistent run history, or real Twitch authorization. The checks did not exercise EventSub, downloads, OBS operations, or Stream Deck changes.

Existing plugins remained separate connections. The work copied no candidate MCP repository into the package and started none of those servers. The Stream Makeover deployment and the public `stream-machine` repository remained unchanged.
