# Bundled Skills

Install bundled skills into `$CODEX_HOME/skills`:

```bash
codex-orchestrator skills install
```

The shipped roster is:

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

The root README intentionally keeps the same roster because `docs:check` uses it as the shipped-file parity surface. This chapter carries the longer operational note: prefer globally installed skills when present, fall back to bundled `skills/<name>/SKILL.md`, and refresh skills after upgrading the npm package when you need new workflow instructions.
