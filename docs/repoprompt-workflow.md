# Use RepoPrompt for project work

Use context-builder often to ground implementation in the repository. Delegate read-heavy investigation and bounded implementation items instead of collecting every file in the coordinator's context.

## Choose a workflow

- Use `rp-build-cli` by default for implementation. Verify the workspace, scan briefly, ask builder for a plan, then implement directly. Use `rp-build` when the CLI is unavailable.
- Use `rp-deep-plan-cli` for substantial plan-only design. Use explore agents for evidence, builder for the draft, and a bounded design critique before writing the final plan. Do not implement during this workflow. Its MCP counterpart is `rp-deep-plan`.
- Use `rp-orchestrate-cli` for scoped delegated items, usually two or three. Reuse an approved plan instead of generating a competing one. Its MCP counterpart is `rp-orchestrate`.

Read the selected installed skill before running it. Reviewing a workflow specification does not start its interview or execute its steps.

For deep-plan, first ask how involved the user wants to be. Up front means grounded questions before broad exploration. Mid-flow means a draft checkpoint before critique. Hands-off means the final handoff. An initial skipped or timed-out choice defaults to Hands-off. A timeout at a later promised checkpoint stops the workflow.

Save the final plan under `docs/plans/`. Read the full builder response and record a coverage ledger before editing it. Preserve supported facts, rationale, edge cases, sequencing, and verification. Explain corrections and removals with evidence. Compare the final plan against that ledger before deleting the export.

## Bind the workspace and worktree

Prefer `rpce-cli` over RepoPromptCE MCP. Discover windows with `rpce-cli -e 'windows'`, then pass `-w <window_id>` on every routed call. Pass `-t <context_id>` on follow-ups so another session cannot redirect work by changing the active tab. Use the builder's returned tab identifier for its follow-ups.

Verify the workspace root and exact session-bound worktree before reading task files or calling builder. Confirm the physical path, branch, HEAD, full Git status, and selected files. A matching workspace name or logical file path does not prove the execution checkout. Never fall back to the primary checkout when binding fails.

These command templates use identifiers returned by the app:

```sh
rpce-cli -w <window_id> -t <context_id> -e 'call manage_worktree {"op":"show"}'
rpce-cli -w <window_id> -t <context_id> -e 'context'
rpce-cli -w <window_id> -t <context_id> -e 'builder "<task and scope>" --response-type plan --export'
```

Give builder and chat calls a command timeout of at least 2700 seconds. Keep secrets, credential files, and local caches out of selections and exports. Review selected context before paid calls.

If the CLI is unavailable, use RepoPromptCE MCP with the same explicit tab and worktree checks. Its `context_builder` uses `response_type: "plan"` and `export_response: true`. Do not switch tools to bypass a denied operation.

## Delegate a bounded item

1. Verify the approved plan, export, selected context, and intended execution location.
2. Give each child an explicit file scope and completion criteria. Pass the returned `oracle_export_path` in its message, with instructions to read it first and work only on the assigned section. Children read the export; they do not continue the parent's Oracle chat.
3. Name sibling assignments and excluded files. Require the child to stop and report a conflict rather than overwrite sibling work. Separate read-only investigation from edit assignments.
4. For RepoPrompt children, set `worktree` or `worktree_id` at `agent_run op=start`. For a new worktree, specify the repository, base, and branch. Verify the returned binding and physical checkout. Start-only binding fields do not belong on `steer`.
5. Use `detach: true` for independent concurrent starts, then collect every result with `wait` or `poll`. Handle current pending interactions using their exact interaction IDs. Send genuine user decisions to the coordinator.
6. Verify the result against the item's completion criteria. Inspect key files and record actual validation command exits. Record HEAD before and after validation-only checks and confirm it did not change. Update the plan before dispatching dependent work.

A child brief can use this form:

```text
Read <oracle_export_path> first. Implement item 2 only.
Own <explicit files>. Finish when <observable checks pass>.
Use <exact worktree path, branch, and worktree ID>.
Sibling owns <other files and task>. Do not edit those files.
If scope overlaps or dependencies are missing, stop and report.
Return changed paths, validation commands, and actual exit codes.
```

Queued, running, interrupted, canceled, or no-matching-tests results are not passes. Capture the producer's exit code when piping validation output. Verify child claims against files and logs before dispatching the next dependent item.

## Recover without duplicate mutations

If a mutation times out or reports `partialSuccessAfterCommit` or `indeterminate_after_commit`, inspect the exact persisted operation, session, and worktree state before continuing. Do not replay the mutation. Creation can leave a durable worktree even when its response fails.

Repair a named binding or authorization prerequisite before one bounded retry. If the failure repeats without a state change, stop and report it. For an expired wait handle, resolve the persisted session through `agent_manage` and use its supported resume path rather than repeatedly polling the expired handle. Never create a replacement merely because a child was interrupted.

## Keep durable evidence

Save findings and review records under `docs/`, with file and line references, commands, exits, and unresolved conflicts. Follow [the project review rules](../AGENTS.md#review-each-change).

After children consume an export and its evidence is recorded, remove the temporary file under `prompt-exports/` using its absolute path. Keep an export while a dependent child still needs it. Deep-plan exports remain until the final fidelity check passes. Do not delete sibling exports or uncertain files. Session cleanup is optional and requires the authority advertised to the caller.
