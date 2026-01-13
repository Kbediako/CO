# Task Checklist - Delegation Network Enablement (0945)

> Set `MCP_RUNNER_TASK_ID=0945-delegation-network-enable` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0945-delegation-network-enable.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] Docs-review manifest captured — Evidence: `.runs/0945-delegation-network-enable/cli/2026-01-12T15-05-27-459Z-d223e67f/manifest.json`.
- [x] Subagent diagnostics captured — Evidence: `.runs/0945-delegation-network-enable-subagent/cli/2026-01-12T15-01-24-348Z-db034e44/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0945-delegation-network-enable.md` - Evidence: `docs/TASKS.md`, `.agent/task/0945-delegation-network-enable.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`.

### Implementation
- [x] Delegation repo config enables sandbox network — Evidence: `.codex/orchestrator.toml`.

### Validation + handoff
- [x] Implementation-gate manifest captured — Evidence: `.runs/0945-delegation-network-enable/cli/2026-01-12T15-06-10-157Z-00ad9b56/manifest.json`.

## Relevant Files
- `.codex/orchestrator.toml`
