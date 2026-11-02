# Guided plugin updates

Add two MCP tools and one packaged skill. Check compares this process's version with the latest stable GitHub release. Prepare downloads its canonical tar archive using authenticated `gh`, verifies GitHub's SHA-256 digest and package identity, and returns a private temporary path. The skill delegates publication to Plugin Creator, verifies saved source, and reports reload separately.

Issue #107 owns private Actions artifacts. Those artifacts are not stable releases. This change does not alter that workflow or publish releases. A maintainer must publish `stream-machine-VERSION.tar.gz` on a stable release tagged `vVERSION`, with GitHub's asset digest available. Without that prerequisite, update remains unavailable.

The builder proposed custom release manifests, persistent service state, three tools, and another release-assets generator. Those additions duplicate GitHub metadata or imply stronger host verification than available. Use GitHub release identity, asset digest, and a skill-led Creator handoff instead. No background updater, account binding database, native UI, or cache writes are needed.

Verify numeric versions, malformed metadata, archive identity/path checks, MCP registration, and packaging locally. Live Creator publication and host reload remain untested until an authorized release exists.
