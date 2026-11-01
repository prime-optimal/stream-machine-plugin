# Run background alert worker

Issue #36 prototype runs as independent Bun process. Terminal launcher exits after worker answers local status request. Keep desktop awake and worker running.

## Verify synthetic lifecycle

From repository checkout, run each command separately:

```sh
mise exec -- bun src/worker/main.ts start --fixture
mise exec -- bun src/worker/main.ts status
mise exec -- bun src/worker/main.ts arm
mise exec -- bun src/worker/main.ts fixture --id local-test-1
mise exec -- bun src/worker/main.ts pause
mise exec -- bun src/worker/main.ts stop
```

Start reports `fixture: true`, `mode: paused`, and `connection: online`. Synthetic event increments `attempted` and `succeeded`. Fixture sink does nothing outside worker. No Twitch request or OBS action occurs.

After stop, status returns `WORKER_COMMAND_FAILED` because socket no longer exists. Restart remains paused. Repeating accepted event ID does not invoke sink again.

Optional `--state-dir /absolute/private/path` selects separate instance. Pass same directory on every command. Default directory is `~/.local/state/stream-machine-worker`. Directory must belong to current user with mode `0700`; Unix socket and ledger use `0600`. macOS and Linux only.

## Connect trusted local adapters

Start worker with an absolute path to trusted local TypeScript module:

```sh
mise exec -- bun src/worker/main.ts start --adapter /absolute/path/to/worker-bindings.ts
```

Module exports `createWorkerDependencies(): WorkerDependencies | Promise<WorkerDependencies>`. Contract lives in `src/worker/contracts.ts`.

Factory creates worker-owned provider connections. Reuse Twitch OAuth/token provider; obtain secrets with fnox and 1Password. Never put tokens in process arguments, event objects, status, logs, or `.env` files. Adapter module executes local code and must not come from model-controlled input. No default live adapter exists.

`source.start({onEvent,onConnection,signal})` installs callbacks and returns promptly. Source owns subscription, reconnect, keepalive, revocation, and transport cleanup. Report `online` only after subscription succeeds. Drop callbacks from stale transport sessions. Signal abort closes provider connection. Connection states are `connecting`, `online`, `reconnecting`, `offline`, and `revoked`.

`onEvent` accepts `{id,type,occurredAt,text}`. Use stable provider message ID, ISO UTC timestamp, and plain alert text. Unknown fields fail validation. Events older than five minutes or more than 30 seconds ahead fail admission. Source must bind one verified account/event. Event payload cannot select OBS target.

`preflight()` performs read-only OBS readiness check and rejects on unavailable target. Any resolved value counts success. Arm imposes five-second deadline. `showAlert({text,signal})` invokes fixed OBS test alert once and resolves on confirmed request. Adapter must not retry writes. Failed or ambiguous writes remain consumed. Use dedicated test source; never broadcast or record.

Parent MCP server can call `registerWorkerTools(server, {stateDir?})` from `src/worker/register.ts`. Tools forward status, arm, pause, and stop to existing worker. Tools do not load adapter modules or launch process. Host shutdown does not terminate detached worker.

## Interpret controls and failure behavior

Worker starts paused. Arm checks source online, ledger capacity, and OBS readiness. Disconnect or reconnect pauses worker; new online signal does not rearm it. Explicit arm required again.

Single action slot admits no backlog. Busy, paused, invalid, or stale events drop immediately. Pause invalidates pending admission before OBS call. Pause requests cooperative cancellation of active call, but already-started OBS request can still complete. `inFlight` reports that condition. Stop aborts source and waits up to five seconds for active action, then exits.

Worker hashes accepted IDs and synchronizes reservations before invoking action. Disk write failure pauses worker and prevents rearming until restart. Restart never replays reservations. Crash between reservation and action can lose alert. This provides bounded at-most-once attempts with retained ledger; it does not guarantee exactly-once visual playback.

Ledger stores no event text, tokens, or armed state. Limit is 10,000 reservations; full ledger blocks new actions. Do not delete ledger to retry an event. Preserve `events.jsonl` when changing runtime files.

Atomic `instance` directory excludes second worker. Crash or force-kill can leave stale instance directory. Confirm no worker remains before manually removing only `instance`. Never remove live socket or signal a process based on reused PID. Stop running worker through CLI first.

Control uses owner-only Unix socket with one strict JSON command per connection, maximum eight clients, 4 KiB request limit, 8 KiB response limit, and bounded read/client deadlines. Same OS user and root remain trusted. Live worker rejects synthetic event injection. Worker emits fixed error codes rather than provider errors.

## Verification evidence

2026-11-01, worker issue worktree:

```sh
mise exec -- bun test
mise exec -- bun run check
```

All 15 tests pass. TypeScript check passes. Real subprocess test launches detached worker, observes launcher exit, dispatches synthetic event, checks socket permissions, rejects malformed/oversized requests, pauses, stops, restarts paused, and verifies persisted deduplication.

Runtime tests cover concurrent events, pause during readiness/reservation, reconnect disarm, failed action without retry, stale/malformed events, corrupt ledger, and capacity failure.

Evidence is synthetic. No subscribed Twitch event, real OBS alert, or actual chat-close session verified here. Those require integrated Twitch/OBS factory and separate live demo evidence for #38. Worker source/OBS connections must be independent of chat host before claiming integrated completion.
