templateVersion: 1

These templates are examples only and are not a stable API. They may change
without semver guarantees.

Templates are never auto-loaded. They are only used when you run the explicit
initializer:

  codex-orchestrator init codex

The initializer copies the contents of templates/codex/ into your working
repository and will not overwrite files unless you pass --force.

Current codex template payload includes:
- `AGENTS.md`
- `mcp-client.json`
- `.codex/config.toml` plus `.codex/agents/*` role files

Next steps (recommended):
  codex mcp add delegation -- codex-orchestrator delegate-server --repo /path/to/repo
  codex-orchestrator codex setup   # optional: CO-managed Codex CLI (activate only when needed via CODEX_CLI_USE_MANAGED=1)
