# Plugin Eval results

These reports come from the `plugin-eval` CLI in [openai/plugins](https://github.com/openai/plugins/tree/main/plugins/plugin-eval). The CLI scores a Codex plugin from static checks and estimated token counts. It does not run the plugin.

To evaluate Stream Machine, run `mise run package`, unpack `docs/packages/stream-machine-<version>.tar.gz`, and run `plugin-eval analyze <unpacked>/stream-machine --format markdown`. The source checkout has no `.codex-plugin/` folder because `scripts/package.ts` generates it.

## Stream Machine 0.8.1 before issue #176

- Report: [stream-machine-0.8.1.md](stream-machine-0.8.1.md).
- Target: the unpacked package built from `dc83254` on `main`.
- Result: score 0, grade F. The checks found 5 errors and 7 warnings.

The packaged manifest sets `interface.defaultPrompt` to a string. The plugin.json spec defines it as an array of up to three strings. `plugin-eval analyze` crashes on the string with `((intermediate value) || []).join is not a function`. The report above was produced from a copy where that one field was wrapped in an array. Nothing else was changed.

The findings are:

| Finding | Cause |
| --- | --- |
| Deferred cost of 242,883 tokens | `scripts/package.ts` copies the whole `docs/` folder, which is 12 MB of reviews, plans, statecharts, demos, and verification scripts. No runtime code reads it. The only linked document is `docs/setup.md`. |
| TypeScript complexity, long lines, and missing tests | The checked TypeScript files are verification scripts under `docs/verification/`, which ship in the package. |
| Missing `websiteURL`, `privacyPolicyURL`, and `termsOfServiceURL` | The `interface` block in `plugin.json` does not set them. |
| Broken relative link in `self-update` | `skills/self-update/SKILL.md` links to `../../docs/setup.md`, which is outside the skill folder. |
| Weak trigger descriptions | The `onboarding`, `preview-recipe`, and `self-update` descriptions do not say when each skill should run. |
| Heavy invoke cost of 2,202 tokens | This is the sum of the manifest and all three skill files. |

## Stream Machine after issue #176

- Report: [stream-machine-176.md](stream-machine-176.md).
- Change: `defaultPrompt` is an array, the manifest sets the three URLs, and the package contains only `docs/setup.md` from `docs/`.
- Result: score 54, grade F. The three URL failures are resolved, and `plugin-eval` runs without the crash. Deferred cost fell from 242,883 to 14,271 estimated tokens. The TypeScript warnings are gone because the verification scripts no longer ship.

The remaining deductions are:

| Penalty | Finding | Cause |
| --- | --- | --- |
| 14 | Deferred cost of 14,271 tokens | `THIRD_PARTY_NOTICES.txt` accounts for 12,578 tokens. The license notices must ship with the bundled dependencies. |
| 14 | Broken relative link in `self-update` | The link to `../../docs/setup.md` resolves inside the package, but it points outside the skill folder. |
| 13.5 | Weak trigger descriptions | The three skill descriptions have no "Use when" sentence. |
| 4.5 | Heavy invoke cost of 2,258 tokens | This is the sum of the manifest and all three skill files. |

## Plugin Builder (openai/plugins PR #239)

- Report: [plugin-builder.md](plugin-builder.md).
- Target: `plugins/plugin-builder` at the PR #239 head.
- Result: score 17, grade F. The manifest is missing `capabilities` and `defaultPrompt`, and `app/package-lock.json` accounts for most of the deferred token cost.
