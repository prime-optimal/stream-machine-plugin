# Stream Machine design reference

[Source archive](stream-machine-reference.tar.gz) preserves all 109 files
from the imported Open Design project `brand-spend-more-time-streaming-ea36da`.
The archive includes the original provenance, fonts, icons, and source ZIP.

Extract it into a separate working directory before design integration:

```sh
mkdir -p /tmp/stream-machine-design-reference
tar -xzf docs/open-design/stream-machine-reference.tar.gz \
  -C /tmp/stream-machine-design-reference
```

The extracted `stream-machine/` folder contains `DESIGN.md`, `guide.md`,
`system/BRAND-SYSTEM.md`, and the editable `docs/kit.dark.html` reference.
`IMPORT.json` records original provenance. The
[file inventory](../verification/188/design-import-sha256.json) records
SHA-256 hashes and sizes for all 109 files.

Archive SHA-256:

```text
9885b86f9f3aa315b16a45f1b150bb28285d54e19bcb3a28cbb0149cf24ce6b7
```

The archive preserves source bytes, not approved execution instructions.
The imported Markdown fails current repository lint rules, and `guide.md`
contains unrelated Plugin Eval prose. Review content before implementation.
No imported script was executed during preservation.
