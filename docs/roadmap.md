# Stream Machine demo roadmap

We are connecting working pieces into Stream Machine. TwitchCon already has Twitch OAuth, a deployed OpenDesign service, accepted alert and overlay workflows, and OpenDesign's HyperFrames integration.

The first goal is four demos. OpenDesign and HyperFrames also start now because they are reuse tasks, not new infrastructure.

Repository: [stream-machine-plugin](https://github.com/prime-optimal/stream-machine-plugin). Project: [Stream Machine #18](https://github.com/users/prime-optimal/projects/18). Planning record: [#9](https://github.com/prime-optimal/stream-machine-plugin/issues/9).

## V1: working demos

The [Demo roadmap view](https://github.com/users/prime-optimal/projects/18/views/1) shows these six outcomes:

| Demo | What already exists | Done when | Issue |
| --- | --- | --- | --- |
| Change my Twitch title | Working Twitch OAuth in TwitchCon | Stream Machine previews a title, applies it to the correct account, and reads it back. | [#27](https://github.com/prime-optimal/stream-machine-plugin/issues/27) |
| Show an OBS alert | Running OBS setup and accepted alert artifacts | A dedicated test source shows the requested message or replay. | [#30](https://github.com/prime-optimal/stream-machine-plugin/issues/30) |
| Add a Stream Deck button | Device, profiles, and the supplied MCP server | One button in a test profile performs its expected action. | [#33](https://github.com/prime-optimal/stream-machine-plugin/issues/33) |
| Alert while chat is closed | Twitch login and the OBS alert action | A real Twitch event triggers the selected OBS alert through a local worker. | [#38](https://github.com/prime-optimal/stream-machine-plugin/issues/38) |
| Make an OpenDesign asset | Sealos deployment and installed authoring scenarios | Stream Machine submits a brief and returns the artifact from an isolated test project. | [#43](https://github.com/prime-optimal/stream-machine-plugin/issues/43) |
| Generate HyperFrames HTML | Existing HTML composition and live driver | Stream Machine returns editable source and playable HTML with working controls. | [#44](https://github.com/prime-optimal/stream-machine-plugin/issues/44) |

The four core demos are checked together in [#49](https://github.com/prime-optimal/stream-machine-plugin/issues/49). The two creative demos proceed in parallel. They do not delay the four core results.

## Start from existing work

Twitch account hookup is [#25](https://github.com/prime-optimal/stream-machine-plugin/issues/25). OAuth is already implemented and has recorded real-account verification. The remaining work is connecting Stream Machine to the verified owner and extending permissions for a title update. This is not a new OAuth system.

OpenDesign hookup is [#43](https://github.com/prime-optimal/stream-machine-plugin/issues/43). The Sealos service already supports authenticated MCP and installed alert and overlay scenarios. Stream Machine needs to use that connection and show its output. The current tool connection returned "Transport closed" during this planning pass, so the first task includes restoring or verifying that connection.

HyperFrames reuse is [#44](https://github.com/prime-optimal/stream-machine-plugin/issues/44). OpenDesign already supplies the composition and render workflow. The remaining check is HTML authoring and playback through Stream Machine. MP4 export and renderer infrastructure are outside this task.

The [reuse evidence](reuse-evidence.md) links the source, recorded checks, and remaining hookup work. Existing service success and new Stream Machine success are recorded separately.

## Work in parallel

The following groups can start independently:

| Owner | First task | Next visible result | Proposed files |
| --- | --- | --- | --- |
| Twitch | [#25](https://github.com/prime-optimal/stream-machine-plugin/issues/25) Use the existing login | [#26](https://github.com/prime-optimal/stream-machine-plugin/issues/26) Read the title, then [#27](https://github.com/prime-optimal/stream-machine-plugin/issues/27) change it | `src/auth/`, `src/adapters/twitch/` |
| OBS | [#28](https://github.com/prime-optimal/stream-machine-plugin/issues/28) Connect to running OBS | [#30](https://github.com/prime-optimal/stream-machine-plugin/issues/30) Show an alert | `src/adapters/obs/`, `recipes/obs/` |
| Stream Deck | [#31](https://github.com/prime-optimal/stream-machine-plugin/issues/31) Read profiles and actions | [#32](https://github.com/prime-optimal/stream-machine-plugin/issues/32) Preview a button, then [#33](https://github.com/prime-optimal/stream-machine-plugin/issues/33) add it | `src/adapters/streamdeck/`, `recipes/streamdeck/` |
| Background alerts | [#36](https://github.com/prime-optimal/stream-machine-plugin/issues/36) Run a worker and [#35](https://github.com/prime-optimal/stream-machine-plugin/issues/35) handle sample events | [#34](https://github.com/prime-optimal/stream-machine-plugin/issues/34) Subscribe, [#37](https://github.com/prime-optimal/stream-machine-plugin/issues/37) arm/pause, then [#38](https://github.com/prime-optimal/stream-machine-plugin/issues/38) prove the alert | `src/events/`, `src/worker/`, `recipes/alerts/` |
| Creative tools | [#43](https://github.com/prime-optimal/stream-machine-plugin/issues/43) Use existing OpenDesign | [#44](https://github.com/prime-optimal/stream-machine-plugin/issues/44) Generate HTML with its HyperFrames workflow | `src/adapters/design/`, `src/adapters/hyperframes/` |
| Plugin experience | [#46](https://github.com/prime-optimal/stream-machine-plugin/issues/46) Open the installed plugin | [#47](https://github.com/prime-optimal/stream-machine-plugin/issues/47) Help the user reach one working demo | `src/ui/`, `skills/` |

These are ownership suggestions, not directories that must all be created. Each task uses its own worktree. Changes to the same manifest or shared file are coordinated before editing.

Issue [#13](https://github.com/prime-optimal/stream-machine-plugin/issues/13) is optional cleanup after two demos need the same helper. It blocks no demo. Separate provider-registry, planner, and general runner tasks [#22](https://github.com/prime-optimal/stream-machine-plugin/issues/22), [#23](https://github.com/prime-optimal/stream-machine-plugin/issues/23), and [#24](https://github.com/prime-optimal/stream-machine-plugin/issues/24) remain shelved. Their small necessary pieces belong in the demos that use them.

## How an issue becomes Done

Each implementation issue has a short **Done when** checklist. Completion means the described result works on the intended setup, its evidence and limits are recorded, and its implementation PR is merged. Relevant existing tests still pass.

A sample response alone does not complete a real-device or real-account demo. Conversely, the prototype does not need every possible failure case solved. Secrets, account ownership, and protection of existing devices remain basic requirements.

A group issue organizes child tasks. It is not a framework that must be implemented first. Shelved issues are marked **Not planned**, not Done.

## V2: clips, games, and artwork

These follow the working demos and can start sooner when capacity is available:

- [#39](https://github.com/prime-optimal/stream-machine-plugin/issues/39) Download one authorized clip.
- [#40](https://github.com/prime-optimal/stream-machine-plugin/issues/40) Read metadata or a transcript from one media URL.
- [#41](https://github.com/prime-optimal/stream-machine-plugin/issues/41) Find game details and artwork.
- [#45](https://github.com/prime-optimal/stream-machine-plugin/issues/45) Make one artwork draft through Canva.
- [#53](https://github.com/prime-optimal/stream-machine-plugin/issues/53) Add the next Twitch read that a concrete demo needs.

## V3: more useful workflows

V3 adds useful features without requiring a public launch:

- [#42](https://github.com/prime-optimal/stream-machine-plugin/issues/42) Show one supported streaming metric with its source.
- [#48](https://github.com/prime-optimal/stream-machine-plugin/issues/48) Add one native shortcut based on actual demo friction.

## Later: polish and sharing

Shared frameworks, broad recovery systems, invited-user hosting, and public distribution stay outside the prototype deadline. They remain recorded for later decisions:

- [#13](https://github.com/prime-optimal/stream-machine-plugin/issues/13) Extract a helper only after two demos use it.
- [#29](https://github.com/prime-optimal/stream-machine-plugin/issues/29) Revisit another OBS server only for a missing feature.
- [#54](https://github.com/prime-optimal/stream-machine-plugin/issues/54) Choose how an invited tester connects.
- [#50](https://github.com/prime-optimal/stream-machine-plugin/issues/50) Add hosting only if that test requires it.
- [#51](https://github.com/prime-optimal/stream-machine-plugin/issues/51) Try the selected demos with one invited streamer.
- [#52](https://github.com/prime-optimal/stream-machine-plugin/issues/52) Prepare a public release of the useful subset.

No calendar dates are promised. V1, V2, and V3 describe small sets of demos, not production-readiness levels.

## Use the board

The default view contains the six demos. The task views expose their supporting work. **Start now** and **Build alongside** identify work that can proceed in parallel. **Waiting for another task** identifies an integrated check. **Later** is outside the current demo work.

Native blocked-by links now represent only concrete prerequisites. No demo waits for the broad shared-code issue. The worker owns its own OBS or MCP connection, because a closed chat cannot supply its tools.

The [source plan](roadmap-plan.json), [issue map](project-state.json), and [verification record](roadmap-verification.md) keep the saved board and this roadmap aligned.
