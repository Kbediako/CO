# Bundled Skills

Install bundled skills into `$CODEX_HOME/skills`:

```bash
codex-orchestrator skills install
```

The command installs all bundled skills by default and skips files that already exist. Use `--force` to refresh installed copies after upgrading the package, or `--only <skill>` to install a bounded subset.

Bundled skills:
- `agent-first-adoption-steering`
- `chrome-devtools`
- `codex-orchestrator`
- `collab-deliberation`
- `collab-evals`
- `collab-subagents-first`
- `delegate-early`
- `delegation-usage`
- `docs-first`
- `elegance-review`
- `land`
- `linear`
- `long-poll-wait`
- `release`
- `standalone-review`

Prefer globally installed skills when present, fall back to bundled `skills/<name>/SKILL.md`, and refresh skills with `codex-orchestrator skills install --force` after upgrading the npm package when you need new workflow instructions.
