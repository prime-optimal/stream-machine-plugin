# Twitch connection button review

## Problem and cause

The desktop Connections panel could recheck access but initially reported Connection URL unavailable on Connect. Another installed plugin server owned callback port 4017. The runtime threw `EADDRINUSE`; registration converted that error to `TWITCH_UNAVAILABLE`, which the UI masked as a setup failure.

PID 70122 started at 17:14:51 local time on November 1, 2026. After an approved stop, the same installed Connect tool returned the expected URL. The verification process then released its listener. The user confirmed that the panel could create the link, but clicking it did not open authorization.

The connection response and UI schema agreed. No schema relaxation or token refresh was needed.

## Implemented behavior

The Connections button now checks configuration and callback-port availability, then calls the existing Connect tool with `openBrowser: true`. The local desktop process requests the default browser directly. A later Open Twitch authorization button uses the same explicit path. Normal use requires no URL copying or host `openLink` call.

Empty Connect inputs remain link-only. A successful launch request does not establish account access. Only an explicit Twitch status recheck verifies the account.

Preflight binds and releases a temporary probe without initializing the account store. A runtime that already owns the listener reports ready. Connect still checks the actual bind because another process can claim the port after preflight. No browser opens while another process holds the port.

The browser helper accepts only `http://localhost:4017/connect`, uses an argument vector without a shell, suppresses process output, and bounds the launch request to ten seconds. Launch failure returns `TWITCH_BROWSER_OPEN_FAILED`. Neither failure triggers an automatic retry or process termination.

The callback remains fixed. [Twitch requires a registered redirect URI](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/). The UI resource is now `workspace-v4.html`, so hosts do not reuse the cached 0.3.0 panel that lacks the stop action.

Sources: `src/auth/local-runtime.ts:14`, `src/auth/callback-owner.ts:9`, `src/auth/desktop-browser.ts:17`, `src/adapters/twitch/register.ts:13`, `src/ui/connections.ts:61`, and `skills/onboarding/SKILL.md:24`.

## Release and replace the callback listener

The first fix still failed in daily use. Every Stream Machine chat runs its own plugin server, and the first chat to show an approval page or Connect link kept port 4017 until the chat closed. A second chat then reported that the port was busy. PID 67877, an installed 0.3.0 server, reproduced that state.

The runtime now stops its callback listener after ten minutes without a Connect call, approval page, or callback request. The OAuth state cookie also expires after ten minutes, so an idle listener has no pending authorization left to finish. The next Connect call binds the port again.

When a bind fails, `findPluginListener` in `src/auth/callback-owner.ts` identifies the holder with `lsof` and `ps`. It accepts exactly one other process whose working directory, or that directory's parent, contains a `plugin.json` named `stream-machine`, and whose command ends with that root's `dist/server.js`. A verified holder returns `TWITCH_LOCAL_PORT_PLUGIN`. Any other holder, or a failed lookup, returns `TWITCH_LOCAL_PORT_BUSY`. The lookup runs only on macOS and Linux.

After the user approves, Connect with `replacePluginListener: true` sends one `SIGTERM` to the verified holder. It then retries the bind every 100 ms for up to five seconds. It never sends `SIGKILL` and never signals an unverified process. The Connections panel shows **Stop the other chat and connect** only for `TWITCH_LOCAL_PORT_PLUGIN`. The stopped chat loses its Stream Machine tools until its host restarts the server.

A hosted OAuth callback would remove the shared port for web and mobile clients. The owner plans that work separately. The local runtime keeps port 4017 because desktop chats still need it.

## Verification

| Check | Exit | Result |
| --- | --- | --- |
| Initial onboarding regressions | 1 | Three failures against unchanged runtime and UI |
| Initial browser-helper regressions | 1 | Missing helper reproduced |
| Integrated focused tests | 0 | 20 tests passed |
| `mise run check` | 0 | TypeScript passed |
| `mise run test` | 0 | 171 tests passed, 970 assertions |
| `mise run build` | 0 | UI, server, and worker bundles built |
| `mise run smoke` | 0 | 32 tools and UI resource passed over stdio MCP |
| `mise run package` | 0 | Archive built and inspected |
| Synthetic browser checks | Passed | Direct action, explicit reopen, launch error, and busy-port error |
| TLC | 0 | 71 states, 118 steps; eight invariants and deadlock check passed |

The listener release and replacement change has its own checks.

| Check | Exit | Result |
| --- | --- | --- |
| `findPluginListener(4017)` against the live holder | 0 | Returned PID 67877 without signalling it |
| `tests/twitch-callback-owner.test.ts` | 0 | A real child process with a Stream Machine root was stopped and replaced. A child with another plugin name kept serving. |
| Idle release test | 0 | Fake timers advanced ten minutes, then a second runtime bound the port |
| `mise run check` | 0 | TypeScript passed |
| `mise run test` | 0 | 180 tests passed, 1011 assertions |
| `mise run build` | 0 | UI, server, and worker bundles built |
| `mise run smoke` | 0 | 34 tools and UI resource passed over stdio MCP |

The [browser evidence](../verification/110-twitch-onboarding/README.md) uses real MCP registration, an isolated callback runtime, and a stub browser launcher. It records three explicit launch attempts, zero provider requests, and no hidden retry. No real OAuth grant or token refresh ran.

The [checked onboarding model](../statechart/110-twitch-onboarding/README.md) includes the race between a ready probe and a failed Connect bind. Actual MCP tests replay that sequence and preserve the unrelated listener.

Desktop ChatGPT has not yet verified the updated package. Computer-use access to that app is blocked. The user must install and refresh the new build before native acceptance can be claimed.

## Required review findings

1. Simplification: extend the existing Connect tool with one optional flag. Reuse the existing transport, consent fields, and revision guards. Remove Twitch-specific host-link wiring. Keep the probe in the runtime module rather than add a listener-sharing protocol.
2. Documentation: onboarding now checks the callback port and explains explicit browser opt-in, error recovery, and the status recheck. Browser-request success and authenticated account verification stay distinct.
3. Statechart: added the bounded onboarding model and generated chart. The existing broader Connections proposal does not describe callback listener ownership, so the new model covers this implementation without rewriting that proposal.

The larger context-builder plan proposed extra response states, a separate preflight module, and a two-step prepare/open flow. This implementation uses existing tool error envelopes and one direct Connect action. These choices preserve the tested boundaries with fewer states and files.

For the listener change, the three answers follow.

1. Simplification: the release is one timer in the existing runtime, and replacement adds one Connect flag and one lookup module. A listener-sharing protocol between chats would need a new transport and token handoff, so this change does not add one.
2. Documentation: the onboarding skill now separates `TWITCH_LOCAL_PORT_PLUGIN` from `TWITCH_LOCAL_PORT_BUSY` and requires approval before a stop. The skill no longer says that Stream Machine never stops another session.
3. Statechart: the onboarding model now includes the holder kind, the approved replacement, and the idle release.

## Retained work and processes

[Worktree snapshot](110-retained-worktrees.json) records paths before the final fix commit. Primary main has unrelated edits to `mise.toml`, `package.json`, and `src/ui/twitch_login.png`; the active #113 checkout also has tool configuration edits and `scripts/ui-audit.ts`. Those belong to the user or sibling UI-audit session and were preserved. Main was not fast-forwarded while another writer was active.

Local-only history remains on the #109 update checkout, #86 review checkout, #105 release checkout, #83 scope checkout, #46 native checkout, #85 transcription checkout, and #81 UX checkout. Each has one commit absent from remote refs except #81, which has three. These belong to their respective task sessions. Their owners must reconcile or push them before cleanup; this task removes none.

Other installed MCP processes remain for existing chats. The observed runtime PIDs were 16471, 67862, and 67877, with their fnox and Bun wrappers. Their owners are the open plugin sessions. No worker or real preview appeared in the scoped scan. Only the approved stale listener and this task's own verification listener were stopped. The synthetic browser fixture and QA tab also stopped. Generated `dist`, dependency links, and the package archive remain as ignored build outputs.

## Delivery limits

Issue #110 remains open and In Progress while the required change awaits merge and native verification. No installed cache, live credentials, grant policy, broadcaster state, or active device profile was edited. The approved stale-server stops were operational recovery. The new replace action stops a verified Stream Machine server only after the user approves it in the panel or in chat.
