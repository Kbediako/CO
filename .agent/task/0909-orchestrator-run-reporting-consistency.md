# Task Checklist - Orchestrator Run Reporting Consistency (0909)

> Set `MCP_RUNNER_TASK_ID=0909-orchestrator-run-reporting-consistency` for orchestrator commands. Keep mirrors in sync with `tasks/tasks-0909-orchestrator-run-reporting-consistency.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (for example `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`).

## Foundation
- [x] Implementation-gate/guardrails manifest captured - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/metrics.json`, `out/0909-orchestrator-run-reporting-consistency/state.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `tasks/index.json` - Evidence: this commit.
- [x] Mini-spec reviewed and approved - Evidence: `tasks/specs/0909-orchestrator-run-reporting-consistency.md`, `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.

## Fixes
- [x] Grouped run summaries reflect overall outcome.
- [x] Scheduler finalization avoids completed timestamps for running.
- [x] Metrics aggregation serialized per task with per-entry pending queue + stale lock cleanup.
- [x] Regression tests updated or added.

## Guardrails
- [x] Spec guard passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Build passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Lint passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Tests pass - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Docs check passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Diff budget passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Review run captured - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
