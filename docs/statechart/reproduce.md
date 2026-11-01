# Reproduce the statechart check

Use the installed statechart skill to regenerate the model results and chart. Run the commands from the repository root.

The commands below use `/tmp/stream-machine-check` for scratch files. If that directory contains work you need to keep, use a different scratch path in every command.

1. Create the scratch directory:

	```sh
	mkdir -p /tmp/stream-machine-check
	```

2. Copy the model, configuration, and view into that directory:

	```sh
	cp docs/statechart/StreamMachine.tla docs/statechart/StreamMachine.cfg docs/statechart/view.js /tmp/stream-machine-check/
	```

3. Run the statechart checker:

	```sh
	.agents/skills/statechart/scripts/statechart /tmp/stream-machine-check/StreamMachine.tla --config /tmp/stream-machine-check/StreamMachine.cfg --view /tmp/stream-machine-check/view.js --out /tmp/stream-machine-check/output
	```

4. Compare the generated report with the [recorded model results](report.md).

The recorded run reached 6 states and 11 steps. Its chart contains 4 states and 9 arrows. The [state-model explanation](README.md#demo-statechart) describes what the model includes and excludes.
