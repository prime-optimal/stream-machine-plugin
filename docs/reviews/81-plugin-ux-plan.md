# Plugin UX planning review

This review covers the proposal in [the UX plan](../plans/plugin-ux-2026-11-01.md), not a running implementation. Issue: [#81](https://github.com/prime-optimal/stream-machine-plugin/issues/81).

## Evidence baseline

Stream Machine baseline: `bc43ca8d5973ac9057a912cef84f444ef17a1bdb`. External MCP extensions baseline: `9e6d418439cca0790bece62f6cd886ad4c04f133` at `/Users/prime/Working/mcp-extensions`.

The external checkout contains an unrelated untracked `plugins/bits-and-bolts.zip`. It was preserved. Read-only research found a host-support conflict: local `docs/spec.md:25` marks mentions supported on Work browser, while [the public extension docs](https://developers.openai.com/plugins/build/extensions) say desktop only. Runtime verification must settle the target-host behavior.

Source anchors verified during planning include `src/server.ts:9` for one UI resource, `src/ui/app.ts:100` for live and mock content on one page, `src/adapters/streamdeck/workspace.ts:30` for inventory limitations, `src/adapters/design/controller.ts:28` for constrained authoring, and `src/adapters/twitch/clips-service.ts:13` for authorized single-clip download. Existing native evidence at `docs/verification/46-native-host.md:57` leaves fullscreen, thread entrypoint, model context, and web untested.

## Required review questions

1. Can code be simplified? No product code changes in this task. The proposal reuses the existing global/thread tools and provider adapters. A generic workspace framework is unnecessary before two real views share behavior.
2. Can documentation be clarified? The plan must distinguish current code, proposed UI, host claims, and observed runtime behavior. Local files are not browser media URLs. Stored Stream Deck configuration is not physical-press verification. A successful model check is not implementation verification.
3. Does the flow need a statechart? Yes. Contextual onboarding includes cancellation, retry, revoked access, and stale responses. [The model](../statechart/plugin-onboarding/README.md) checks those safety rules. OAuth redirects, permissions, storage, multiple accounts, and eventual completion remain outside its scope.

## Validation record

- `mise run install`: exit 0.
- `mise run hooks:install`: exit 0; existing global hk hooks retained.
- Statechart rerun from this worktree with the absolute local skill-runner path: exit 0. TLC reached 24 states and 77 steps. Five invariants and deadlock check passed.
- A first rerun using a worktree-relative skill-runner path failed because that runner is not bundled in fresh worktrees. The reproduction command now names the verified local runner and explains that dependency.
- No ChatGPT host, OBS setup, OAuth connection, USB write, or video playback was exercised during this planning task.

## Planning-tool recovery

RepoPrompt discovery completed in the isolated worktree. Its first plan generation failed before the provider call because eight binary screenshots were selected as text. Removed those images from selection, retained discovered text context, and resumed through Oracle plan mode. No screenshot inspection is claimed from that failed selection.

## Retained work

Other task worktrees were not edited or removed. A sibling media-integration session is active and its branch advanced during this task. The primary checkout remains clean at its original HEAD and has active processes, so it was not fast-forwarded underneath them.

Snapshot before final handoff:

| Worktree or branch | State and owner | Next step |
| --- | --- | --- |
| Primary `stream-machine-plugin` | Clean; active user and agent processes; behind fetched main | Owning sessions coordinate update |
| `/private/tmp/stream-machine-secrets` | Clean; secrets task; behind upstream | Owner reviews retained checkout |
| `feat/39-clip-download` | Clean; upstream deleted after merge | Owner checks cleanup prerequisites |
| `feat/18-media-integration` | Active sibling session; local commits appeared during inspection | Owner finishes checks and pushes |
| `feat/40-media-info`, `feat/41-game-lookup` | Clean; media task owners; behind upstream | Owners reconcile |
| `feat/42-streaming-metric` | Clean; matches upstream | Owner retains or cleans after merge |
| `stream-machine-demo` | Clean; running Bun process; demo owner | Keep source path while process uses it |
| `stream-machine-native-46` | Clean; deleted upstream; local commit `94371ca` | Owner verifies squash inclusion before cleanup |
| `stream-machine-twitch-53` | Clean; Twitch task owner; behind upstream | Owner reconciles |

Installed Stream Machine cache processes, Open Design helpers, and RepoPrompt processes also remain running. No process was stopped. Process identities were inspected without copying command arguments or credentials.

## Final review and fidelity

The complete 486-line Oracle response was read before integration. Its supported details remain in the engineering sections; the opening sections add the product experience that the first draft under-specified.

| Baseline content | Final location or correction |
| --- | --- |
| Current app/transport, control ownership, provider boundaries and missing capabilities | Current-state analysis |
| Routes, empty entrypoint contracts, deep-link validation, per-thread drafts | Routed shell; Tools migration route added |
| Read revisions, immutable write identity, unknown outcomes, lifecycle cleanup, concurrency | App state and lifecycle; Persistence and concurrency |
| Home and session recents | Home and view composition |
| Constrained creative recipes, journal recovery, safe preview/source | Assets experience and Assets contracts |
| Single-ID clips, metadata, ownership, uncertain downloads, player/save fallback | Clips experience and contracts; added required category/clipper/offset fields |
| Device geometry, preview expiry, USB authorization, release, physical proof | Stream Deck sections |
| Recipe availability and preserved Twitch/OBS/worker controls | Recipe system and Recipes contracts |
| Contextual setup, return route, task preservation | Contextual onboarding; added OBS capture storyboard |
| Metadata validation, nullable fields, thumbnail restrictions | Clip metadata contract |
| Private artifact registry/chunks, bounds, cancellation, hash check, file safety | Candidate A retained for experiment; compare host resource and HTTP delivery before choosing |
| Host modes, deep links, context exclusions, local transport gap | Host-specific extension plan and support gaps |
| Existing stores, session state, contention, rollback | Persistence and concurrency; Risks and migration |
| File impacts, regression tests, automation/browser/native/live acceptance | Planned file changes; execution index; acceptance |

Corrections have explicit reasons. Assets/Connections are product labels over internal design/setup routes. UI resource versioning replaces URI preservation because cache-breaking UI needs a new resource identity. Incremental migration replaces an all-at-once migration to follow the project's smallest-visible-demo rule. Active-view polling replaces manual-only checks because long generation needs progress without resubmission. Chunk delivery remains a candidate because no host playback or remote transport has been verified. Authenticated OBS setup is a provider prerequisite, not an unchanged-client promise. New image/video/native-profile capabilities remain separate from the initial UI migration.

The first Markdown check failed on whitespace and a generated report heading; those formatting issues were corrected. Final check results and critique follow below.

Final critique found four actionable issues, now corrected: account/session authorization for media handles; known download refusals separated from lost acknowledgments; Connections terminology and Advanced recovery IDs; and event-ordered navigation after one-time initial deep-link routing. The critic confirmed no supported Oracle requirements were lost.

The fidelity ledger passed. Candidate A remains conditional, all security/cleanup/limit tests remain explicit, and expanded product requirements have separate capability gates. The consumed Oracle export remains in ignored `prompt-exports/`: RepoPrompt rejected deletion as an unsupported protected physical mutation. No alternate deletion was attempted. The planning session owns that retained export; cleanup can use a supported RepoPrompt operation later.

Final Markdown, whitespace, and unstaged secret-hook checks passed with exit 0. Staged content is checked again before commit. This is documentation-only work; no UI screenshot is needed to evidence implementation, because no implementation is claimed.
