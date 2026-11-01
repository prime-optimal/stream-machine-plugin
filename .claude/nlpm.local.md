---
strictness: standard
score_threshold: 80
discovery:
  extra_paths:
    - "AGENTS.md"
    - "plugin.json"
    - "skills/*/SKILL.md"
  exclude:
    - ".agents/skills/**"
    - ".claude/skills/**"
    - "**/node_modules/**"
    - ".claude/**"
rule_overrides:
  R51:
    enabled: false
---

# NLPM config — stream-machine-plugin

Scored artifacts: `AGENTS.md`, `plugin.json` (agent-plugins schema with the `com.openai` extension, not `.claude-plugin/`), and the plugin's own skills in `skills/`.
`.agents/skills/statechart` and `.claude/skills/statechart` are installed from `cursor/plugins` via `skills-lock.json`; they are excluded.

Vocabulary lives in `.agents/vocabulary.yaml`. The global `vocab-pre-commit` git hook (`~/.agents/skills/scripts/vocab_check.py`) enforces it on commit, so R51 stays off here.
