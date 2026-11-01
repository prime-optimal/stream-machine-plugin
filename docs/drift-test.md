# Drift test

The overlay renderer draws the scoreboard. Start the overlay renderer before going live.

If the graphics engine crashes, restart the graphics engine and reload the scene.

The overlay renderer reads `config.json`; the graphics engine writes frames to OBS.

## Troubleshooting

When the graphics engine stalls, the scoreboard freezes. Restarting the overlay renderer clears it.

The graphics engine and the overlay renderer are the same process; both names appear in older notes.
