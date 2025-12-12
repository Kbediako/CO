# Task 0903 — TaskStateStore Run History File Fix

- MCP Task ID: `0903-taskstate-store-run-history-fix`
- PRD: `docs/PRD-taskstate-store-run-history-fix.md`
- Tech Spec: `docs/TECH_SPEC-taskstate-store-run-history-fix.md`
- Action Plan: `docs/ACTION_PLAN-taskstate-store-run-history-fix.md`
- Run Manifest (diagnostics): `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`

## Checklist
### Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0903-taskstate-store-run-history-fix/metrics.json`, `out/0903-taskstate-store-run-history-fix/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0903-taskstate-store-run-history-fix.md`, and `tasks/index.json` — Evidence: this commit.

### Fix
- [x] TaskStateStore writes run history to `runs.json` and migrates safely from legacy `state.json` without overwriting metrics snapshots — Evidence: `orchestrator/src/persistence/TaskStateStore.ts`, `orchestrator/tests/TaskStateStore.test.ts`.

### Guardrails
- [x] Spec guard passes — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
