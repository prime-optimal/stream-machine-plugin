# Review OBS scene tools

- Simplification: The tools share validation, the existing WebSocket client, and the alert mutation queue. Each operation sends at most one mutating request.
- Documentation: The OBS guide distinguishes the new tools from the existing alert and describes shared-source checks, live-scene visibility, and the external-writer race.
- Statechart: No statechart update is needed. These tools perform one requested operation and do not add a persistent flow.
- Issue completion: #220 remains open until merge and evidence publication. The new mutations have not been tested against live OBS.
