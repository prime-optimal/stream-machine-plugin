# Hosted user storage for clip downloads

Issue [#136](https://github.com/prime-optimal/stream-machine-plugin/issues/136) adds private user files to the existing [OAuth Site](https://stream-machine-oauth-test.tinycocoa22.chatgpt.site). This record describes the tested source patch. It does not claim production deployment.

## Ownership and results

A signed-in Sites user owns a persistent random UUID folder. D1 stores the user-to-folder mapping. R2 stores clip bytes under `<folderUUID>/clips/<artifactUUID>.mp4`. The folder can contain other data kinds later. Twitch reconnects do not change its owner or folder.

The hosted download factory binds the Sites owner and that owner's Twitch account provider at construction. Tool arguments contain only the clip ID. The existing Twitch client checks clip identity, and the factory checks download scope and broadcaster ownership before storage.

Successful hosted downloads return `{mode,clip,format,artifact}`. The artifact contains `storage: "hosted"`, `id`, `url`, `bytes`, `sha256`, and `completedAt`. It exposes no filesystem path, object key, or folder ID.

The file URL is a permanent authenticated locator, not a bearer credential. Every GET requires the existing Sites sign-in helper and a matching artifact owner. Anonymous users receive 401. Foreign users and missing IDs receive the same 404 before R2 access. Responses use private no-store caching and attachment delivery.

The user changed the Site audience to public during implementation. Read-back confirmed `access_mode: public` at version 3. The public homepage does not grant access to user files. Storage routes reject missing identity themselves.

Local stdio remains the explicit fallback and retains its private filesystem path. Hosted failures never silently save to a local directory.

## Streaming and failure limits

The hosted writer accepts only the existing Twitch CDN HTTPS host and rejects redirects. It sends no Twitch credentials to the CDN. A positive declared content length is required, capped at 512 MiB. A FixedLengthStream preserves R2's stream length while the transfer checks byte count and SHA-256.

The deadline is 120 seconds. A successful R2 upload and validated completion precede the D1 artifact insert. Failed upload, invalid completion, or metadata failure triggers object cleanup. Failed cleanup can leave an inaccessible orphan because no artifact record permits reading it.

The deadline cannot cancel an already-running D1 insert. A caller can receive a timeout while a valid private artifact finishes later. Automatic retries, duplicate suppression, quotas, deletion, orphan reconciliation, and retention limits are outside this change.

## Source and integration

The [source patch](136-hosted-user-storage.patch) applies to the Site repository based on `5b183b7a023ef69bb2cb14066ebfd0c01547ccda`. The separate source checkout is ignored at `docs/hosted-oauth-site/`.

Issue [#130](https://github.com/prime-optimal/stream-machine-plugin/issues/130) owns hosted MCP, the plugin default, and the sole coordinated Site deployment. Its owner received the patch. It must merge these additions with its own source:

1. Apply the patch and merge the additive `db/schema.ts` declarations.
2. Preserve `0001_title_previews`. Generate combined Drizzle metadata for the reserved `0002_user_storage.sql` migration. Do not use the independent checkout's metadata, which was generated without #130's table.
3. Set the existing hosting manifest's R2 binding to `BUCKET` and preserve its Site ID and public audience.
4. Sync shared `auth/twitch.ts` and `adapters/twitch/clips-client.ts` under `lib/stream-machine/`. Use `zod/v4` for shared schemas when retaining the Site's Zod 3 dependency.
5. Bind `createHostedClipDownload({ownerId,accounts,db,bucket,origin})` from `lib/clips/download.ts` to the per-request hosted runtime. Derive `ownerId` from trusted Sites identity, never tool arguments.
6. Run all Site tests, TypeScript, and the Sites build. Publish once through the supported source workflow.
7. Verify anonymous and forged-identity requests on the public deployment. Record a signed-in tool download and owner-only browser access separately.

The integration owner must not deploy an older source archive over another chat's changes. No Site source push or deployment was performed by this issue's storage author.

## Verification

All listed commands exited 0 in the issue worktree on November 1, 2026, using Bun 1.4.4.

| Check | Result |
| --- | --- |
| Site `mise exec -- bun test tests` | 59 tests passed, 109 assertions. |
| Site `mise exec -- bun run check` | TypeScript passed. |
| Real Workers runtime test | Workerd streamed through FixedLengthStream into actual local R2 and D1. Owner read returned exact bytes, foreign read 404, anonymous read 401. |
| Root `mise run check` | TypeScript passed. |
| Root `mise run test` | 246 tests passed, including the independent Site checkout's tests. |
| Root `mise run smoke` | 34 tools and bundled stdio smoke passed. |
| Root `mise run build` | App, MCP server, worker, and event adapter built. |
| State model | Six invariants and deadlock check passed across 172 states and 846 steps. |

Initial clip tests failed before their modules existed. Storage tests likewise failed before implementation. Ownership tests use actual migration SQL. The Worker test uses a synthetic clip and fixture identity, not real Twitch or Sites sessions. No production clip download or second live user was verified by these tests.

See the [code review](136-storage-code-review.md) and [checked state model](../statechart/136-user-storage/README.md). Required merge and production integration remain owned by #130; #136 stays open and In Progress.
