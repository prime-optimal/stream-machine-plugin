# Manage project secrets

Use fnox to inject credentials into a process. Store source credentials in 1Password and use an encrypted local age cache for normal runs. fnox injects secrets; it does not scan source files for leaks.

## Prepare a clone or worktree

1. Install the project tools with `mise install`.
2. Make the existing global mise helpers available. They are workstation tasks, not tasks shipped by this repository. Check `mise tasks` for `fnox-init`, `fnox-opref`, `fnox-apikey`, and `fnox-sync`. If they are missing, ask the workstation owner to install the approved helpers before continuing.
3. Make the age private identity available outside the repository through the approved workstation setup. A new worktree needs access to that identity and its own local cache. Never copy the private identity into the worktree.
4. Confirm that the merged project and global fnox configuration includes the age provider required by `fnox-sync`. Preserve the existing 1Password references. The project already has configuration; do not run init again for normal setup.
5. When authorized to fetch credentials, run `mise run fnox-sync` interactively. This first sync resolves the source references and writes cached ciphertext to the ignored `fnox.local.toml` overlay. The file must remain uncommitted.

Normal `fnox exec` runs use the local age-encrypted cache without calling `op`. Keep the original source references unchanged. Use the project's mise tasks to select the managed fnox version. For a standalone command, use `mise exec -- fnox exec -- <command>`. Do not use a command that prints its environment.

The helper tasks depend on the workstation configuration, 1Password access, and an available age identity. A clone alone does not provide those prerequisites. Setup does not authorize creating or changing 1Password items.

## Refresh credentials intentionally

After expiry or rotation, run `mise run fnox-sync` explicitly to fetch source values again and refresh the local ciphertext cache. Do not expect cached runs to fetch rotated values automatically. If sync fails, fix provider access or the missing identity before retrying. Do not print credentials to diagnose the failure.

## Choose a helper

Use these helpers through `mise run`, not a bare fnox binary, to select the project-managed version.

- `mise run fnox-init` always prompts. Use it only for an authorized initial configuration, not each session or clone.
- `mise run fnox-opref` reads an existing 1Password item and records its reference. Use it when an item already exists.
- `mise run fnox-apikey` prompts for a hidden value and creates a live 1Password item. Run it only with explicit authorization to create that item. Never pass the value as an argument.
- `mise run fnox-sync` intentionally refreshes the encrypted local cache. It requires an age provider in the merged project and global configuration.

`fnox-opref` and `fnox-apikey` skip cache sync when no age provider exists in that merged configuration. That helper behavior does not make the age cache optional for this project. After changing references, refresh the required cache intentionally.

## Keep secrets out of Git and output

Keep `fnox.toml` committable when it contains provider settings and references rather than credentials. An `op://` reference identifies a field; it is not the field's secret value. See the [fnox 1Password provider guide](https://fnox.jdx.dev/providers/1password.html) for reference formats. Preserve existing reference mappings unless the task authorizes a change.

Never commit `fnox.local.toml`, private age identities, credential files, or environment files. Encryption does not make the local cache a project artifact. Never put secrets in source, chat, logs, command arguments, or `.env` files. Do not run `fnox get`, `fnox list --values`, or verbose commands that expose secret output.

The staged secret check described in [the Git workflow](git-workflow.md#check-staged-secrets) adds protection, but default scanner rules cannot detect every password. Review staged content before committing. If a credential was exposed, stop sharing the output, rotate the credential, and coordinate repository cleanup. Removing a file alone does not revoke a credential.
