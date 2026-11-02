# Twitch Connections port conflict

## Finding

Connections failed because another installed Stream Machine process already owned the local OAuth port. The connection response and UI schema agree.

The older process, PID `70122`, started on November 1, 2026 at 17:14:51 local time. It ran the installed `0.3.0/dist/server.js` and listened on `127.0.0.1:4017`. It was another plugin server, not a preview fixture.

Sources: `src/auth/local-runtime.ts:36-39` starts the listener, `:94-95` starts it during Connect, and `src/adapters/twitch/register.ts:37-40` maps an address conflict to `TWITCH_UNAVAILABLE`. Status checks do not start this listener. `src/ui/connections.ts:73-75` hides the tool error behind the connection URL message.

## Verification

| Check | Exit | Result |
| --- | --- | --- |
| Synthetic two-runtime reproduction | 0 | First Connect succeeded; second threw `EADDRINUSE` on an isolated port |
| Installed Connect before recovery | Tool error | `TWITCH_UNAVAILABLE` |
| `lsof -nP -iTCP:4017 -sTCP:LISTEN` before recovery | 0 | PID `70122` owned the port |
| Approved `kill -TERM 70122` | 0 | Older plugin server stopped |
| Listener check after stop | 1 | No listener |
| Installed Connect after recovery | Success | Returned `http://localhost:4017/connect` and current consent fields |
| Listener check after successful call | 0 | Current plugin process `81960` owned the port |
| Approved `kill -TERM 81960` | 0 | Released verification listener so the panel can acquire the port |
| Final listener check | 1 | No listener |

The synthetic reproduction used two runtimes, an ephemeral port, separate in-memory stores, fake credentials, and a fetcher that throws on any provider request. Both runtimes closed afterward. No real token refresh, OAuth grant, browser authorization, or provider write ran.

The direct tool result changed from error to success after the conflicting listener stopped. Native panel confirmation is pending. Desktop computer inspection is blocked by the host tool.

## Remaining work

Operational recovery frees the port but does not fix concurrent plugin sessions. Issue #110 stays open and In Progress. A durable fix must report the port conflict clearly and safely coordinate listener ownership. Do not trust an arbitrary process merely because it owns port 4017.

OAuth state uses shared SQLite, but title previews and approval guards remain process-local. Any shared-listener design must preserve those boundaries and verify matching runtime configuration and consent policy.

## Review

1. Simplification: no source change is needed to establish the cause. Avoid speculative URL parsing or schema changes.
2. Documentation: this report distinguishes a successful tool response from native panel verification. The original screenshot shows the generic failure, not missing credentials.
3. Statechart: no runtime behavior changed. Existing navigation models do not describe cross-process OAuth listener ownership. A durable ownership change needs its own checked model and regression tests.

No completed runtime fix is claimed. Repository build and domain tests were not needed for process-only recovery. Dependency installation and hook setup both exited 0 in the isolated worktree.
