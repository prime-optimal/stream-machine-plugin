# Review OBS server split

- Simplification: OBS reuses its existing registration. Both smoke checks share one discovery helper.
- Documentation: Setup and packaged skills route OBS and Stream Deck to their separate servers. Reinstall and start a new conversation to load the new routing.
- Statechart: No update needed. The split moves tool registration between processes without changing device actions or their states.
- Issue completion: #191 remains open pending merge, desktop verification, and an evidence comment.
