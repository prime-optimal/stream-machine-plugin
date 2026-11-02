# Review of the creative desktop server

Issue: [#213](https://github.com/prime-optimal/stream-machine-plugin/issues/213).

The creative server owns its widget and registers the existing creative tools. The widget calls those tools through its MCP host. The provider connects to Sealos through MCP and reads authorization from the server environment. The manifest contains no credentials. The server is desktop-only; this change does not establish a hosted creative service or public submission compatibility.

## Review questions

- Simplification: The widget uses the existing controller, request journal, and provider. It does not add a cross-server proxy or a second provider implementation.
- Documentation: The widget identifies the desktop requirement and the write to OpenDesign. It reports generation status and shows returned data as text.
- Statechart: No controller transition changed. Existing operation states and request IDs remain authoritative, so a new statechart is not required for this slice.

## Original branch verification and limits

- `mise run install`, `mise run hooks:install`, `mise run check`, `mise run build`, and `mise run package` passed.
- `mise run test` passed: 282 tests passed, two skipped, zero failed.
- `mise exec -- bun scripts/package-smoke.ts` passed: OBS three tools, creative six, desktop four. Creative smoke opens the workspace and reads its resource without provider credentials.
- Local Brave preview displayed the form and a host-unavailable message with actions disabled. This was a layout-only fixture without an MCP host. A host-originated tool call and a live creation from the widget remain unverified.
- Project creation and generation require configured server-side OpenDesign authorization. The widget never accepts or renders credentials.
- `mcp.json` and `scripts/build.ts` overlap issue #192. Preserve both server entries and build outputs during integration. The OBS server from #191 is already in the base commit.
- A package can declare multiple MCP servers, but the submission portal connects only one server per plugin. Local MCP submission requires partner approval. Do not claim public submission compatibility from local smoke results.
