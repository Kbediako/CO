# Task Checklist — TaskStateStore Run History File Fix (0903)

> Set `MCP_RUNNER_TASK_ID=0903-taskstate-store-run-history-fix` for orchestrator commands. Mirror with `tasks/tasks-0903-taskstate-store-run-history-fix.md` and `docs/TASKS.md`.

## Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0903-taskstate-store-run-history-fix/metrics.json`, `out/0903-taskstate-store-run-history-fix/state.json`.
- [x] Mirrors updated — Evidence: this commit.

## Fix
- [x] Snapshot collision resolved; run history uses `runs.json`.

## Guardrails
- [x] Spec guard passes.
- [x] Lint passes.
- [x] Tests pass.
