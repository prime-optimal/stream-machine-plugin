# Review hosted user storage

No blocking finding in the reviewed storage and clip factory code. Hosted MCP integration and publication remain separate acceptance work under issue #130.

Source paths below belong to the independent Site checkout at `docs/hosted-oauth-site/`. This review does not establish that the published Site runs these changes.

## Code simplicity

No simplification is needed for this slice. `lib/clips/download.ts:28` keeps the existing Twitch scope and broadcaster checks before storage. `lib/user-data/store.ts:22` allocates the user's UUID folder through a unique owner key. `lib/user-data/store.ts:47` checks artifact ownership before calling R2.

The transfer keeps bounded streams rather than buffering a clip. Its injected fetch, stream constructor, and store allow error-path tests without another provider abstraction. The Worker test exercises the actual fixed-length stream and R2 binding.

Two operational limits remain:

- `lib/clips/storage-writer.ts:61` races the whole storage operation against a deadline. Aborting the stream cannot cancel an in-flight D1 metadata insert after upload. A timeout can leave a completed artifact after the caller receives an error. Do not claim transactional cancellation or retry deduplication.
- `lib/user-data/store.ts:42` suppresses cleanup errors. An inaccessible R2 orphan can remain after a failed write. This slice has no orphan reconciliation or retention policy.

These limits do not grant another user access to a file.

## Documentation clarity

Keep the public Site audience distinct from private files. The UUID folder and artifact URL identify data; neither authorizes a read. `app/api/user-data/files/[id]/route.ts:6` requires the existing Sites user, and `lib/user-data/store.ts:51` queries both artifact ID and owner.

The artifact URL is a permanent authenticated locator. Do not describe it as an expiring link, bearer token, or public bucket URL.

`tests/clips/worker.test.mjs:19` uses a test-only identity header. It verifies storage isolation in Workers, D1, and R2. It does not verify Sites edge identity validation or forged-header stripping. Production evidence must test that boundary after #130 integration.

The integration owner must regenerate the combined Drizzle journal and snapshot after its title-preview migration. The storage snapshot based on migration 0000 must not replace #130's metadata.

## Statechart coverage

The new [checked storage model](../statechart/136-user-storage/README.md) covers owner-only reads, anonymous rejection, unpublished objects, stable folders, and the absence of a silent hosted-to-local fallback. Its report explicitly excludes transport identity validation, SQL concurrency, R2 behavior, and production deployment. No additional statechart is needed for this patch.

The model treats storage transitions as definite outcomes. It does not establish transactional cancellation or resolve an uncertain write acknowledgment.

## Validation

Reviewer reran these commands in the independent Site checkout:

| Command | Result |
| --- | --- |
| `mise exec -- bun test tests/clips tests/user-data` | Exit 0. 31 tests, 95 assertions. |
| `mise exec -- bun run check` | Exit 0. |

The reviewed tests include owner and foreign-user reads, pending-file denial, metadata failure, cleanup failure, exact byte counts, SHA-256, Twitch ownership, and the actual Workers stream/R2 path.

## Issue completion

Not complete at review time. Hosted MCP wiring, the combined migration, sole-owner deployment, live identity checks, and published issue evidence remain the coordinator's work. Keep issue #136 open and its board item In Progress while required changes await merge.
