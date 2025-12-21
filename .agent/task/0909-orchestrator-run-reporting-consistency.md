# Task Checklist - Orchestrator Run Reporting Consistency (0909)

> Set `MCP_RUNNER_TASK_ID=0909-orchestrator-run-reporting-consistency` for orchestrator commands. Keep mirrors in sync with `tasks/tasks-0909-orchestrator-run-reporting-consistency.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (for example `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`).

## Foundation
- [ ] Diagnostics/guardrails manifest captured - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] Metrics/state snapshots updated - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/metrics.json`, `out/0909-orchestrator-run-reporting-consistency/state.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `tasks/index.json` - Evidence: this commit.
- [ ] Mini-spec reviewed and approved - Evidence: `tasks/specs/0909-orchestrator-run-reporting-consistency.md`.

## Fixes
- [ ] Grouped run summaries reflect overall outcome.
- [ ] Scheduler finalization avoids completed timestamps for running.
- [ ] Metrics aggregation serialized per task.
- [ ] Regression tests updated or added.

## Guardrails
- [ ] Spec guard passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] Build passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] Lint passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] Tests pass - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] Docs check passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] Diff budget passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] Review run captured - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
