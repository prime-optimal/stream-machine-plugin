---
name: self-update
description: Check Stream Machine versions and release notes, prepare a verified package, and guide an explicitly requested Plugin Creator update with saved-release verification and honest reload status.
---

# Update Stream Machine

The Site-backed plugin is the default. Sites deploys its server and refreshes its canonical plugin. The tools below update the optional local package only; they do not update the Site. If they are unavailable on the hosted connection, do not start a local process to check the hosted version. Preserve both `mcp.json` entries: `stream-machine` for the hosted server and `stream-machine-local` for the desktop server.

Run `stream_machine_update_check`. Show `runningVersion`, `availableVersion`, changelog, and package availability. Running version describes this MCP process; it does not prove which version the host installed. A missing compatible stable GitHub release is unavailable, not current. Private releases require authenticated `gh` on the MCP host. Actions artifacts are not stable releases.

On an explicit update request, run `stream_machine_update_prepare`. Continue only after verification succeeds. Show version and SHA-256. The returned archive lives in a private temporary directory on the MCP host. If Plugin Creator cannot access that absolute path, report the host boundary and stop before publishing. Never copy files into a running plugin cache.

Use Plugin Creator's update-plugin workflow. Retrieve exact backend plugin ID from authoritative discovery or a previously saved Plugin Creator result; the historical ID in docs is a lookup hint only. Store the verified ID in the user's agreed local record outside the plugin package; do not embed an account-specific ID in shared source. Read `get_plugin_files` for that exact ID and verify Stream Machine identity, editable source, scope, current version, configuration, and `current_release_id`. Follow inventory pagination. Preserve audience, IDs, default prompts, MCP bindings, and unrelated files. Stop on identity mismatch or managed-plugin ineligibility. Never create a replacement plugin.

Compare candidate manifests, skills, and configuration with current source. A release package overlays existing files; omitted files remain. Never infer deletions from absence. Resolve unexpected losses or configuration changes before upload. Rehash the local archive with SHA-256 immediately before submission and require the preparation digest. If current saved version already equals or exceeds candidate, stop without downgrade or duplicate publication.

If publication affects shared users and existing authorization does not cover that change, present the exact impact and obtain authorization. Invoke Plugin Creator `update_plugin` with `archive` as verified absolute path, `plugin_id` unchanged, and fresh `current_release_id` as `expected_release_id`. Never retry an indeterminate update. Read back source first. On conflict, retrieve current files and reconcile the candidate rather than replacing the precondition on stale work.

After success, call `get_plugin_files` again. Verify returned backend ID, new release ID, version, changed files, retained configuration, and skill inventory. Report saved release separately from runtime. Include returned plugin URL. If read-back fails or differs, report saved result as unverified and stop. Retain resulting plugin ID and release ID in the same agreed local record for the next update.

Report `reload pending` until a supported host reload or fresh conversation starts the new MCP process. Run `stream_machine_update_check` there and compare `runningVersion` with saved target. A saved release never proves host installation or reload. Do not terminate streaming workers or broadcasts to reload. If automatic reload lacks host support, state the required host step. Keep prepared archive for review or retry; remove only the exact temporary directory when no longer needed.
