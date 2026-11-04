# Retained work at clip gallery handoff

Snapshot: 2026-11-02. Other sessions own their branches and active processes. No unrelated work was removed or committed. Local-only counts mean commit IDs not reachable from remote refs; squash-merged equivalents need separate verification.

| Worktree | Branch | State | Owner and next step |
| --- | --- | --- | --- |
| `/Users/prime/Documents/ChatGPT/stream-machine-plugin` | `main` | ?? docs/verification/obs-wicked-demo/; 0 local-only commit IDs | Existing branch/session owner; preserve and reconcile before cleanup |
| `/private/tmp/stream-machine-193-creative` | `feat/193-creative` | clean; 2 local-only commit IDs | Existing branch/session owner; preserve and reconcile before cleanup |
| `/Users/prime/Documents/ChatGPT/.repoprompt-worktrees/stream-machine-plugin/chore-166-vendor-skills` | `chore/166-vendor-skills` | clean; 1 local-only commit IDs | Existing branch/session owner; preserve and reconcile before cleanup |
| `/Users/prime/Documents/ChatGPT/.repoprompt-worktrees/stream-machine-plugin/feat-157-hosted-menu` | `feat/157-hosted-menu` | clean; 2 local-only commit IDs | Existing branch/session owner; preserve and reconcile before cleanup |
| `/Users/prime/Documents/ChatGPT/.repoprompt-worktrees/stream-machine-plugin/feat-161-no-chatgpt-signin` | `feat/161-no-chatgpt-signin` | clean; 4 local-only commit IDs | Existing branch/session owner; preserve and reconcile before cleanup |
| `/Users/prime/Documents/ChatGPT/.repoprompt-worktrees/stream-machine-plugin/feat-164-home-menu` | `feat/164-home-menu` | clean; 6 local-only commit IDs | Existing branch/session owner; preserve and reconcile before cleanup |
| `/Users/prime/Documents/ChatGPT/.repoprompt-worktrees/stream-machine-plugin/fix-desktop-no-fnox` | `fix/desktop-no-fnox` | clean; 1 local-only commit IDs | Existing branch/session owner; preserve and reconcile before cleanup |
| `/Users/prime/Documents/ChatGPT/stream-machine-clips-218` | `codex/218-clip-gallery-evidence` | clean; 0 local-only commit IDs | This task; evidence PR awaits merge |
| `/Users/prime/Documents/ChatGPT/stream-machine-demo` | `codex/49-demo-integration` | clean; 33 local-only commit IDs | Existing branch/session owner; preserve and reconcile before cleanup |
| `/Users/prime/Documents/ChatGPT/stream-machine-sync-189` | `codex/189-preserve-hosted-ui` | clean; 1 local-only commit IDs | Existing branch/session owner; preserve and reconcile before cleanup |

Site checkout `/Users/prime/Documents/ChatGPT/stream-machine-clips-site-218` is clean at 0795a194f3dde7c7aae96bca007d90f5b7f26227. The Sites helper verified its exact source push before version 20 publication. It has no conventional upstream because source access is credential-scoped. Retain it for future Site maintenance.

Local branch `codex/218-site-clip-gallery` retains the original evidence commit 38a2b72. Its changes are preserved as 765e8ba on the pushed evidence branch. Keep until the evidence PR merges.

## Running source dependencies

The two task-owned preview servers, ports 4398 and 4399, were stopped. The following unrelated process groups still use Stream Machine directories. Only names, PIDs, and working directories were inspected. Their session owners must approve stopping or moving them.

| Directory | Processes | Next step |
| --- | --- | --- |
| `/Users/prime/Documents/ChatGPT/stream-machine-plugin` | zsh 1121, zsh 1141, zsh 1146, zsh 1156, zsh 1167, zsh 1187, zsh 1198, zsh 1242, zsh 1272, codex 2483, 18.15.0 2499, 18.15.0 2501, 18.15.0 2502, 18.15.0 2503, 18.15.0 2504, 18.15.0 2506, 18.15.0 2524, codex 2531, codex 2603, node_repl 3209, node 3212, node_repl 3581, repoprompt-mcp 13827, node_repl 13845, node 15561, node 15562, codex 15565, repoprompt-mcp 18533, repoprompt-mcp 18548, repoprompt-mcp 19490, node_repl 19494, node_repl 19495, node 19498, node_repl 19539, node_repl 31248, node 31249, node_repl 31418, node_repl 33938, node 33939, node_repl 34160, node_repl 36841, node 36842, node_repl 36846, node_repl 37001, codex 38146, codex 38147, node 38155, node 38156, codex 38167, node_repl 40058, node_repl 40061, node 40064, node_repl 40207, zsh 42757, node_repl 42857, node 42858, node_repl 43021, 18.15.0 43794, Google Chrome for Testing 43965, chrome_crashpad_handler 43967, chrome_crashpad_handler 43969, Google Chrome for Testing Helpe 43980, Google Chrome for Testing Helpe 43981, Google Chrome for Testing Helpe 43982, codex 52274, node 52572, node_repl 52573, node_repl 52618, repoprompt-mcp 58825, Open Design Helper 58826, node_repl 58827, codex-code-mode-host 59139, node_repl 61465, node 61466, node_repl 61467, node_repl 61556, node 61557, node_repl 61558, node_repl 61875, node 61876, node_repl 61877, 18.15.0 62178, 18.15.0 63178, codex 64225, codex 64226, node 64227, node 64228, codex 64229, 18.15.0 85239, 18.15.0 85264, node 85270, node 85286, node 85287, node 85306, python3.14 87791, zsh 90421, Google Chrome for Testing Helpe 91409, Google Chrome for Testing Helpe 91476, node_repl 95544, node 95561, node_repl 95994, node_repl 98564, node 98565, node_repl 98566, node_repl 99758, node 99759, node_repl 99760 | Existing runtime/session owner retains source path |
| `/Users/prime/.codex/plugins/cache/created-by-me-remote/stream-machine/0.9.1` | aubeshim 3219, bun 3267, aubeshim 13844, bun 13909, aubeshim 15357, bun 15554, aubeshim 16197, bun 16279, aubeshim 19511, bun 19530, aubeshim 35573, bun 35600, aubeshim 36864, bun 36996, aubeshim 40067, bun 40208, aubeshim 51859, bun 51985, aubeshim 52576, bun 52616, aubeshim 55165, bun 55186, aubeshim 59644, bun 59669, aubeshim 60696, bun 60782, aubeshim 60896, bun 60944, aubeshim 68144, bun 68185, aubeshim 97420, bun 97433 | Existing runtime/session owner retains source path |
