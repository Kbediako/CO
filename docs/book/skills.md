# Bundled Skills

Install bundled skills into `$CODEX_HOME/skills`:

```bash
codex-orchestrator skills install
```

The command installs the shipped skill folders and skips files that already exist. Use `codex-orchestrator skills install --force` after upgrading the package when you want installed copies refreshed, or `--only <skill>` for a bounded install.

The canonical shipped roster lives in [skills/README.md](../../skills/README.md). `docs:check` uses that file as the shipped-file parity surface so the GitHub front door can stay concise.

Prefer globally installed skills when present, fall back to bundled `skills/<name>/SKILL.md`, and refresh skills after upgrading the npm package when you need new workflow instructions.
