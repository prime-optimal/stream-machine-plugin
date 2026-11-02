# Host Stream Machine Twitch tools

Implement [#130](https://github.com/prime-optimal/stream-machine-plugin/issues/130) in `codex/130-hosted-mcp`, based on `aa3fd74`. Preserve existing OAuth Site identity and Twitch records. Make the Site-backed plugin the default and retain local stdio as an explicit desktop fallback.

## Implementation

1. Extract the existing Twitch registration and clients from desktop dependencies. Keep the local wrapper compatible.
2. Synchronize an explicit list of shared modules into the independent Sites source repository. Record file hashes there.
3. Add authenticated, stateless `POST /mcp` with Sites protocol discovery, tool discovery, and tool calls. Sites authenticates the request; the handler requires its injected user ID. Strict schemas reject caller-selected ownership.
4. Bind Twitch access and persistent title previews to that request's user. Reuse encrypted D1 tokens, validation, refresh, and revocation. Require browser approval and atomic preview consumption before a title write.
5. Publish the existing Site with `mcp` capability, retaining its current audience. Use the canonical plugin and connection metadata returned by Sites. Keep local stdio configuration available separately.
6. Run isolation tests, local compatibility tests, Site build, model checks, package checks, and live authentication probes. Publish issue evidence and open a PR.

## Plan review

The RepoPrompt builder covered identity, reuse, persistent approval, desktop isolation, fallback, and deployment evidence. Its proposed `/api/mcp` path is corrected to `/mcp` by the Sites contract. Sites explicitly authenticates MCP callers and forwards a Site-scoped user ID; an additional identity stack is unnecessary. The builder's private deployment assumption is superseded by the user's public Site setting, verified during coordination with #136. Public pages do not authorize anonymous tool or data access.

Issue #136 owns clip storage in a separate worktree. This task owns the Site deployment and integrates the storage code only after its checks pass. No desktop device bridge or automatic mutation retry is added.

## Verification boundaries

Unit tests use synthetic Twitch responses and real SQLite execution of D1 queries. Deployment and protocol checks do not prove a phone session, host installation, or live title mutation. Report those separately. Denial and unknown write outcomes never authorize an automatic switch to a local account.
