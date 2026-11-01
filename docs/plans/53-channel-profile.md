# Connected Twitch profile read

Issue [#53](https://github.com/prime-optimal/stream-machine-plugin/issues/53) adds one useful read for a channel branding brief.

## Scope

Add `stream_machine_twitch_profile` through the existing Helix client, account provider, and tool registration. Request `GET /helix/users` without lookup parameters. Require exactly one complete profile with the connected account ID. Return description, profile photo, and offline image with source metadata.

Keep the existing OAuth, scopes, storage, title reads, and title approval flow. Treat empty images as null. Validate nonempty image URLs as HTTPS. Reuse sanitized provider errors. Add no writes or extension query.

## Implementation

1. Add isolated profile tests and confirm failure before implementation.
2. Extend `src/adapters/twitch/client.ts` with schema validation and the profile read.
3. Add `profile()` to `TwitchTitleService` and register a strict empty-input tool.
4. Update both smoke checks and the package tool count.
5. Verify one connected KLabFM profile through the bundled stdio server, then read the current title.
6. Record the capability review and validation. Commit and push the task branch.

## Builder coverage

The complete RepoPrompt builder response was read from `oracle-plan-2026-11-01-135928-53-read-only-profile-82b1.md`. Session `5A61511F-9ADA-4E3E-AEFE-21F7BF306F9C` was bound to the #53 worktree at base `ea769cd`. The builder made no source edits.

| Builder requirement | Disposition |
| --- | --- |
| Existing adapter and account-provider path | Preserved. No OAuth internals changed. |
| Exact authenticated endpoint and identity check | Implemented. No arbitrary lookup. |
| Explicit image semantics and strict data validation | Implemented. Offline image is separate from the header. |
| Existing errors and no adapter retry | Preserved and tested. |
| Tool registration and private-field exclusions | Tested through real in-memory MCP transport. |
| Title behavior and approval protections | Existing Twitch tests retained and passed. |
| No new UI or statechart | Preserved. Profile output is visible through the MCP result. |
| Tests in existing test file | Moved to a focused `tests/twitch-profile.test.ts` to isolate fixtures. |
| Response source | Added to meet issue #53's source requirement. |
| Smoke and package discovery | Added count updates after inspecting both smoke scripts. |
| Extensions as follow-up | Documented from official API and upstream source review. |
| Validation limited to unavailable accounts | Expanded to one authorized harmless live profile read, as issue #53 requires. |

## Validation

Run `mise run check`, `mise run test`, `mise run smoke`, `mise run package`, and `mise run hooks:check`. The smoke task builds first. Exercise the bundled server through real stdio MCP with the existing cached credentials. Invoke only profile and channel reads.

See [verification](../verification/53-channel-profile.md) and [review](../reviews/53-channel-profile.md) for actual results.
