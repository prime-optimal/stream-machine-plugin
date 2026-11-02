# Stream Machine source preservation

Issue: <https://github.com/prime-optimal/stream-machine-plugin/issues/189>

The GitHub primary checkout was clean at `96b0df4` and matched
`origin/main`. A pull could not retrieve the hosted UI repairs or the design
import because those files lived outside this repository.

## Preserved files

- [Hosted repair report](188/hosted-ui-investigation.md): exact copy of the
  repair checkout's final report, including its uncommitted v19 host checks.
- [Site repair patch](188/site-repair.patch.gz): code and regression tests from
  Site commit `1684340e133174f2bdbf617c6498e282332e25c1` through
  `dd69c199fa5f5989444027503cbcbb88ca95ced8`. It includes the v17 rejection
  diagnostics merged from `5485f3f332dac907454b241c4ee78bff630e98ee`.
  The patch excludes the older committed report.
- [Design reference archive](../open-design/README.md): all 109 files
  from the imported design system, including fonts, icons, the source ZIP,
  and `IMPORT.json` provenance. Total size is 12,784,230 bytes.
- [File hashes](188/design-import-sha256.json): SHA-256 hashes and byte sizes
  for every imported file. Every extracted file matches its source.

The hosted Site retains its independent source repository. This patch is a
recovery artifact, not a second editable Site checkout. The existing
`docs/hosted-oauth-site/` exclusion and separate publication workflow remain.
The Site repair checkout is
`/Users/prime/Documents/ChatGPT/stream-machine-ui-repair`.
The original design import is
`/Users/prime/Documents/ChatGPT/test/docs/open-design/stream-machine`.

## Checks

- `git apply --check` passed against a detached Site worktree at `1684340`.
  That temporary worktree was removed after the check.
- Byte comparisons passed for all 109 design files; the file sets match.
- Gitleaks found no leaks in the design import with archive traversal depth
  2 and allow-comments disabled. The repair artifacts also passed.
- Repository hooks rejected 40 Markdown violations in the imported files.
  The original bytes are preserved in an archive instead of rewriting them
  or changing repository lint rules. The extracted archive passed all 109
  recorded file hashes. This is preservation, not design approval; `guide.md`
  contains unrelated Plugin Eval prose that needs review before integration.
- This preservation does not change runtime code or deploy a Site or plugin.
  The repair report records the earlier runtime tests and host verification.

## Retained work

The main checkout remains clean. Other retained plugin worktrees were clean
at audit time. Branches `chore166`, `feat157`, `feat161`, `feat164`,
`fix-desktop-no-fnox`, and `stream-machine-demo` had no configured upstream.
They remain in place; their owners must verify whether unique commits need
publication before cleanup.

The original Site repair report remains dirty in its independent checkout.
This GitHub copy preserves those edits. No unrelated files were staged,
reverted, or removed from that checkout.

Older open PRs 183, 180, 156, and 154 cover CI, evaluation, packaging, and
publication evidence. A pull does not include these unmerged changes. This
task does not merge them.

## Review

- Simplicity: retain a small patch and provenance rather than duplicate the
  entire independent Site repository.
- Prose: distinguish deployed repairs, archived evidence, and imported design
  references. Imported files remain byte-for-byte unchanged.
- Statechart: no update needed. This task archives files without changing
  runtime states, transitions, or authorization rules.
