# PR #216 integration repair

Issue: [#213](https://github.com/prime-optimal/stream-machine-plugin/issues/213).
PR: [#216](https://github.com/prime-optimal/stream-machine-plugin/pull/216).
Integration base: `630b83b2ada8ff3cb1d2e8ee6ec6bdd7fa1ab98d`.
Original PR head: `edd99a6b101e3dcd7dfd539fbe1a2507896335f9`.

## Cause and repair

The PR's original CI passed, but GitHub reported merge conflicts after the OBS and Stream Deck integrations reached main.
A read-only merge-tree check and the deferred merge reproduced conflicts in five files.

| File | Resolution |
| --- | --- |
| `mcp.json` | Preserve hosted Twitch, OBS, and stream-machine-streamdeck; append stream-machine-creative |
| `scripts/desktop-smoke.ts` | Keep seven OBS and six Stream Deck tools; add six creative tools and resource/open checks |
| `scripts/package-smoke.ts` | Check all three local servers and both manifest formats |
| `scripts/package.ts` | Require all four server entries and all five local bundle/UI files |
| `tests/package-archive.test.ts` | Seed and assert all five bundle files in real extracted archives |

The merge preserves main's Stream Deck action runner, OBS scene tools, shutdown handlers, release version 0.11.0, and current Actions pins.
No controller, provider, journal, or creative widget behavior was redesigned.

Local verification also exposed a relative-path bug.
`creative-smoke.ts dist/creative-server.js` passed a relative path while `verifyServer` changed the child directory to dist, effectively requesting dist/dist/creative-server.js.
The helper now resolves the path before changing the child directory.
A real bundled-server regression failed before the repair and passed afterward.

## Validation

| Command or check | Result |
| --- | --- |
| Initial merge-tree and deferred merge | Exit 1; exactly five expected conflicts |
| Focused package/workflow/creative tests | Eight passed before the added regression |
| Relative-path regression before fix | One pass, one failure |
| Relative-path regression after fix | Two passed; real stdio server opened and resource read |
| `mise run check` | Exit 0 |
| `mise run test` | Exit 0; 312 passed, two skipped, zero failed |
| `mise run package` | Exit 0; ZIP and tar.gz produced, 25 inspected entries each |
| `mise run smoke` | Exit 0; OBS seven, Stream Deck six |
| `mise exec -- bun scripts/creative-smoke.ts dist/creative-server.js` | Exit 0; creative six |
| Staged package smoke | Exit 0; all three local servers |
| Extracted ZIP and tar.gz smoke | Exit 0 for each; OBS seven, Stream Deck six, creative six |
| Main runtime/version comparison | No changes to server shutdown, Stream Deck layout/action source, or release-version files |

Each extracted package was tested from a temporary directory with a cleared environment and an empty home directory.
Creative smoke lists tools, opens the workspace, and reads its HTML resource.
It does not create a project or start generation.
Temporary extraction directories were removed.

## Review

1. Simplification: compose the existing server inventories and bundle lists. Normalize the executable path once in the shared smoke helper.
2. Documentation: the package reference now describes all four servers. Original branch verification remains labeled historical; current counts are recorded here.
3. Statechart: no provider/controller state transition changes. The smoke-path repair changes test process startup, so no product statechart update is required.
4. Completion: this fixes mergeability and package validation. The PR remains draft while its original live widget/provider verification is unresolved. Issue #213 remains open and In Progress pending its acceptance work and merge.

The original `/private/tmp/stream-machine-213-creative-ui` checkout was clean and left untouched.
All repair work used `/Users/prime/Documents/ChatGPT/stream-machine-pr216-fix`.
The original PR ref receives a normal fast-forward push; no force push is needed.
No deployment, plugin installation, provider write, broadcast change, or device mutation was performed.
