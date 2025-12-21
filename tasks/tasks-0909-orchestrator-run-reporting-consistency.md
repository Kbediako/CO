# Task 0909 - Orchestrator Run Reporting Consistency

- MCP Task ID: `0909-orchestrator-run-reporting-consistency`
- Primary PRD: `docs/PRD-orchestrator-run-reporting-consistency.md`
- Tech Spec: `docs/TECH_SPEC-orchestrator-run-reporting-consistency.md`
- Action Plan: `docs/ACTION_PLAN-orchestrator-run-reporting-consistency.md`
- Mini-spec: `tasks/specs/0909-orchestrator-run-reporting-consistency.md`
- Run Manifest (diagnostics): pending `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`

## Checklist
### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: this commit.
- [ ] Mini-spec reviewed and approved - Evidence: `tasks/specs/0909-orchestrator-run-reporting-consistency.md`.
- [ ] Diagnostics/guardrails manifest captured - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] Metrics/state snapshots updated - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/metrics.json`, `out/0909-orchestrator-run-reporting-consistency/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0909-orchestrator-run-reporting-consistency.md`, and `tasks/index.json` - Evidence: this commit.

### Fixes
- [ ] Grouped run summaries reflect overall outcome - Evidence: `orchestrator/src/manager.ts`, `orchestrator/tests/TaskManager.test.ts`.
- [ ] Scheduler finalization avoids completed timestamps for running - Evidence: `orchestrator/src/scheduler/plan.ts`, `orchestrator/src/cli/services/schedulerService.ts`, `orchestrator/tests/SchedulerPlan.test.ts`.
- [ ] Metrics aggregation serialized per task - Evidence: `orchestrator/src/cli/metrics/metricsRecorder.ts`, `orchestrator/src/cli/metrics/metricsAggregator.ts`.
- [ ] Metrics aggregation regression coverage added - Evidence: `orchestrator/tests/MetricsAggregator.test.ts` (or new recorder test).

### Guardrails
- [ ] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] `npm run build` passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] `npm run lint` passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] `npm run test` passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] `npm run docs:check` passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
- [ ] `npm run review` captured with NOTES - Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
