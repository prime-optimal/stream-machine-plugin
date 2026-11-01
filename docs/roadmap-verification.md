# Project board verification

The GitHub API checks completed on 2026-11-01. The [verification data](roadmap-verification.json) contains the UTC timestamp, view URLs, counts, and check results.

## Created work

The roadmap contains 9 parent epics and 34 build issues. A separate planning issue, #9, tracks the board and documentation work. The project retains completed issues #1, #3, and #5.

Every build issue has a native parent, a release milestone, a track label, a priority label, and project fields for Track, Priority, and Start. The 56 native blocked-by links match the plan. The dependency graph has no cycles.

The first release milestone contains 20 build issues. The second contains 12. The third contains 2. No milestone has a committed date.

The Start field identifies 14 independent tasks, 16 tasks that can begin with fixtures, and 4 integrated acceptance tasks. Completion dependencies do not prohibit fixture development. The Start field requires manual updates as work progresses.

## Saved views

The project has these saved views:

| View | Purpose |
| --- | --- |
| [All work](https://github.com/users/prime-optimal/projects/18/views/1) | Complete project history and roadmap. |
| [First release](https://github.com/users/prime-optimal/projects/18/views/2) | Open implementation work for personal streaming and unattended alerts. |
| [Parallel starts](https://github.com/users/prime-optimal/projects/18/views/3) | Independent and fixture-based work across milestones. |
| [Twitch](https://github.com/users/prime-optimal/projects/18/views/4) | Twitch account and API work. |
| [OBS](https://github.com/users/prime-optimal/projects/18/views/5) | OBS provider and isolated action work. |
| [Stream Deck](https://github.com/users/prime-optimal/projects/18/views/6) | Device inventory, page previews, and test-profile writes. |
| [Background automation](https://github.com/users/prime-optimal/projects/18/views/7) | EventSub, worker lifecycle, authorization, and the event-to-OBS proof. |

## Verification scope

The checks compared live GitHub state with [roadmap-plan.json](roadmap-plan.json) and [project-state.json](project-state.json). They verified the following properties:

- Native parent and child relationships match the plan.
- Native blocked-by links match the plan and form an acyclic graph.
- Each build issue has the expected milestone, labels, and project fields.
- Every new issue belongs to Project #18.
- Completed history remains closed and marked Done.
- The project remains private.
- Saved view names, layouts, and filters match the requested configuration.

The API checks verify saved view configuration, not browser rendering. No implementation task, provider process, credential flow, or device action ran during board setup.

The board uses GitHub's [native issue dependencies](https://docs.github.com/en/rest/issues/issue-dependencies) and [Projects API](https://docs.github.com/en/graphql/reference/projects). Each issue contains acceptance criteria, proposed file ownership, parallel-start guidance, and source links where applicable.

The [implementation roadmap](roadmap.md) records the confirmed priorities and explains how to use the board.
