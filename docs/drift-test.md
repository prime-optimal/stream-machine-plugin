# Drift test

The overlay renderer draws the scoreboard. Start the overlay renderer before going live.

If the overlay renderer crashes, restart the overlay renderer and reload the scene.

The overlay renderer reads `config.json`; the overlay renderer writes frames to OBS.

## Troubleshooting

When the overlay renderer stalls, the scoreboard freezes. Restarting the overlay renderer clears it.

The overlay renderer and the overlay renderer are the same process; both names appear in older notes.

The stream deck sends hotkeys to OBS. If the control surface stops responding, unplug the stream deck and reconnect the control surface.
