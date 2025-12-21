# Action Plan - Orchestrator Run Reporting Consistency (Task 0909)

1. Draft PRD, tech spec, mini-spec, and task checklist.
2. Implement grouped run summary anchoring, scheduler finalization guard, and metrics serialization.
3. Add regression tests in TaskManager, SchedulerPlan, and metrics aggregation where appropriate.
4. Run guardrails in order: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.
5. Capture implementation-gate/guardrails manifest and update checklist mirrors with evidence paths.

## Evidence
- Implementation-gate/guardrails manifest: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T08-53-32-077Z-8900ea95/manifest.json`.
- Metrics / State Snapshots: `.runs/0909-orchestrator-run-reporting-consistency/metrics.json`, `out/0909-orchestrator-run-reporting-consistency/state.json`.
