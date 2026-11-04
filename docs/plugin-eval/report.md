# About the plugin-eval score and what NLPM misses

This report covers issue [#176](https://github.com/prime-optimal/stream-machine-plugin/issues/176) and PR [#177](https://github.com/prime-optimal/stream-machine-plugin/pull/177). It explains why `plugin-eval` scored Stream Machine at 0 and what raised it to 54. It also compares those scores with the NLPM rubric. The two tools measure different things, and the comparison shows how much each one can see.

The per-run reports are listed in the [results index](README.md).

## Where we got stuck

The widget was the visible failure. In ChatGPT desktop, the Stream Machine panel showed "Couldn't display Stream Machine". Twitch tool calls through the hosted Site worked, and so did OBS and Stream Deck through `stream-machine-desktop`. Only the widget failed.

We reproduced the failure without the desktop UI. A script drove `codex app-server` and called `mcpServer/resource/read` on the `codex_apps` server. Every URI returned JSON-RPC error `-32602 "Invalid params"`, including `ui://other/x.html`, which does not exist. Our Site handler returns `-32002 "Resource not found"` for an unknown URI, so the error does not come from our resource lookup. For comparison, the Bits & Bolts Remote app loaded its widget through the same call. For an unknown URI, its own server answered "Resource not found". The widget failure is still open. The evidence points at the Sites gateway or at how it forwards `resources/read`, and the Sites docs describe tool calls only.

The manifest problem was quieter. The packaged `.codex-plugin/plugin.json` set `interface.defaultPrompt` to a string. The plugin.json spec defines it as an array of up to three strings, each at most 128 characters. Codex installed and ran the plugin without a warning, so nothing told us the field was wrong. The listing URLs `websiteURL`, `privacyPolicyURL`, and `termsOfServiceURL` were also missing, and nothing reported that either.

## What we tried

We installed OpenAI's evaluator in two ways.

1. We installed the CLI from a clone of [openai/plugins](https://github.com/openai/plugins) at `~/src/openai-plugins`. Running `bun link` in `plugins/plugin-eval` put `plugin-eval` on the `PATH` at `~/.local/bin/plugin-eval`.
2. We installed it as a Codex plugin. A personal marketplace file at `~/.agents/plugins/marketplace.json` lists one entry, `./plugins/plugin-eval`. That path resolves under the home folder, so `~/plugins/plugin-eval` is a symlink to the clone. `codex plugin add plugin-eval@personal` copied it into `~/.codex/plugins/cache/personal/plugin-eval/0.1.2/`.

Codex runs the cached copy, not the symlink. After a `git pull`, remove the plugin and add it again.

The Codex install worked from a smoke run in an empty `/tmp` folder:

```sh
codex exec --skip-git-repo-check -s workspace-write \
	'$plugin-eval Evaluate the plugin at ~/src/openai-plugins-pr239/plugins/plugin-builder. Reply with only the score, grade, and the first fix.'
```

It replied "Score: 17/100. Grade: F. First fix: add `interface.capabilities` to `.codex-plugin/plugin.json`." That matches the CLI result for Plugin Builder from openai/plugins PR [#239](https://github.com/openai/plugins/pull/239). An earlier run with `-s read-only` gave no usable answer. We did not find out why, and switched to `workspace-write` with `-o` to capture the final message.

Then we pointed the CLI at Stream Machine. The source checkout has no `.codex-plugin/` folder, because `scripts/package.ts` generates it, so the target has to be the unpacked package from `mise run package`. `plugin-eval analyze` crashed on that package with this error:

```text
((intermediate value) || []).join is not a function
```

The evaluator calls `.join()` on `defaultPrompt` and expects an array. A string is truthy, so the `|| []` fallback never runs. The crash was the first and only signal that the field had the wrong type.

To get a baseline score, we copied the package and wrapped that one field in an array with `jq '.interface.defaultPrompt |= [.]'`. The first copy lived in a folder named `sm-pkg-fixed`. That added a `manifest-name-directory-mismatch` warning that the real package does not have. The evaluator expects the folder name to match the manifest `name`. Rerunning from `/tmp/sm-pkg-fixed/stream-machine` removed the warning. The committed report for 0.8.1 comes from that corrected copy.

## What raised the score from 0 to 54

The 0.8.1 baseline scored 0 with 5 errors and 7 warnings. Most of the damage came from one packaging choice. `scripts/package.ts` copied the whole `docs/` folder into the plugin, which added 12 MB of reviews, plans, statecharts, demos, and verification scripts. The package had 378 entries. The evaluator counts every shipped text file as deferred context the model might load, and estimated 242,883 tokens. It also scored the TypeScript verification scripts under `docs/verification/` for complexity and missing tests.

PR #177 made three changes:

1. `scripts/package.ts` writes `defaultPrompt` as an array.
2. The manifest sets the three listing URLs.
3. The package ships only `docs/setup.md` from `docs/`.

The package dropped to 21 entries and 14,271 estimated deferred tokens. The score rose to 54, with 2 errors and 4 warnings. The evaluator also stopped crashing on the real package, so no patched copy is needed.

The remaining deductions are listed in the [results index](README.md#stream-machine-after-issue-176). `THIRD_PARTY_NOTICES.txt` accounts for 12,578 of the deferred tokens and must ship with the bundled dependencies. The other two fixes are small: put the `self-update` setup link inside the skill folder, and add a "Use when" sentence to each skill description.

## How the NLPM rubric scored the same plugins

[NLPM](https://github.com/xiaolai/nlpm) scores natural-language artifacts such as skills, agents, commands, and manifests. We applied its 1.1.2 rubric with the method from the `nlpm-omp-init` skill. Code computed the countable rules: name and folder match, description length, body length, and the vague-word scan. Judgment covered only the trigger-quality and example rules, and every finding quotes a real line. The plugin score is the mean of the artifact scores. Expect a margin of about 5 points on the judgment rules.

The `plugin-eval` scores come from `plugin-eval analyze` on each plugin folder at the current `openai/plugins` main, except Plugin Builder, which is at the PR #239 head.

| Plugin | plugin-eval | NLPM |
| --- | --- | --- |
| Stream Machine 0.8.1, before #176 | 0 (crash on the real package) | 97.0 |
| Stream Machine after #176 | 54 | 97.0 |
| Plugin Builder (PR #239) | 17 | 99.5 |
| figma | 0 | 77.3 |
| hyperframes | 21 | 99.1 |
| game-studio | 49 | 96.7 |
| plugin-eval | 68 | 99.5 |
| github | 95 | 92.5 |
| coderabbit | 100 | 94.3 |
| expo | crash | 96.8 |

NLPM gave Stream Machine the same 97 before and after #176. Its only finding was a missing "Use when" clause in `skills/self-update/SKILL.md`, which costs 15 points on that file. None of the three fixes in #177 changes an NLPM score.

The rubric does know the field type. NLPM's Codex conventions say `defaultPrompt` must be an array. Its scoring tables have no penalty row for that, though. The scorer's "Do Not Invent Findings" rule therefore drops the finding, and a string `defaultPrompt` costs nothing. The same is true of the listing URLs, which the conventions mark as optional, and of package size. No NLPM rule looks at files outside skills, agents, and commands, so 12 MB of shipped docs did not register.

The two tools disagree in both directions. Plugin Builder scores 99.5 in NLPM and 17 in `plugin-eval`, because NLPM sees a clean skill and `plugin-eval` sees a missing manifest field and a 92 KB `package-lock.json`. Figma goes the other way on prose. NLPM scores its four agents at 50 each and finds long skill bodies and vague wording. `plugin-eval` scores figma at 0 for broken skill links and token budgets. Coderabbit scores 100 in `plugin-eval`, but NLPM finds that `skills/coderabbit-review/SKILL.md` declares `name: code-review` in a folder named `coderabbit-review`.

Neither tool flags the `client_secret` field in `plugins/github/.mcp.json`. NLPM's secrets rule covers only `.claude/settings*.json`, and `plugin-eval` has no secrets check. NLPM did penalize that file 15 points for a missing `command`, but the server uses HTTP transport with a `url`, so the finding is a false positive.

## What each score tells you

The two scores answer different questions. NLPM asks whether the instructions are well written: whether a skill says when to run, avoids vague words, stays short, and gives examples. `plugin-eval` asks whether the package is well formed and cheap to load: whether the manifest has the required fields with the right types, whether links resolve, and how many tokens a model might pull in.

For Stream Machine, the problems that mattered were packaging problems. NLPM gave a near-perfect score to a plugin whose manifest crashed OpenAI's evaluator and which shipped 12 MB of unrelated files. An NLPM score of 97 says the three skills read well. It says nothing about whether the package installs cleanly, lists correctly, or loads cheaply. Our NLPM CI gate is still useful for prose. It is not a release check.

`plugin-eval` has its own limits. Its token thresholds report "Baseline samples: skills=0, plugins=0", so the budget penalties use fixed limits, not a measured baseline. Across the 48 plugins in openai/plugins, 2 crash the same way ours did, `expo` and `outlook-calendar`, because both set `defaultPrompt` to a string. Of the 46 that run, 6 score 0, 25 score below 60, and 13 score 90 or more. The median is 58. A low score is common even for OpenAI's own plugins, so read the individual checks rather than the total.

Neither tool runs the plugin. Neither would have caught the widget failure, which is still open.

## Reproduce the numbers

To score the whole openai/plugins catalog, run this from the clone:

```sh
for p in plugins/*/; do
	plugin-eval analyze "$p" --format json --output "/tmp/pe-all/$(basename "$p").json"
done
```

Each JSON file has `summary.score`. The two crashing plugins write no JSON and print the `.join` error.

To score Stream Machine before #176, build the package from `dc83254`, unpack it, wrap `defaultPrompt` in an array as described above, and run `plugin-eval analyze` on the `stream-machine` folder. To score it after #176, run `mise run package` on `main` and analyze the unpacked folder directly.

The NLPM scores have no CLI. The rubric lives in the NLPM plugin under `skills/nlpm/scoring/SKILL.md` and `agents/scorer.md`. Apply it as described in [How the NLPM rubric scored the same plugins](#how-the-nlpm-rubric-scored-the-same-plugins).
