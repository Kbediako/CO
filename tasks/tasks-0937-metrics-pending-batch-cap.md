# Task 0937 - Metrics Pending Batch Cap

- MCP Task ID: `0937-metrics-pending-batch-cap`
- Primary PRD: `docs/PRD-metrics-pending-batch-cap.md`
- Tech Spec: `docs/TECH_SPEC-metrics-pending-batch-cap.md`
- Action Plan: `docs/ACTION_PLAN-metrics-pending-batch-cap.md`
- Mini-spec: `tasks/specs/0937-metrics-pending-batch-cap.md`
- Run Manifest (docs review): `.runs/0937-metrics-pending-batch-cap/cli/2026-01-06T02-47-08-254Z-23dd2c54/manifest.json`
- Metrics/State: `.runs/0937-metrics-pending-batch-cap/metrics.json`, `out/0937-metrics-pending-batch-cap/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-metrics-pending-batch-cap.md`, `docs/TECH_SPEC-metrics-pending-batch-cap.md`, `docs/ACTION_PLAN-metrics-pending-batch-cap.md`, `tasks/tasks-0937-metrics-pending-batch-cap.md`, `tasks/specs/0937-metrics-pending-batch-cap.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0937-metrics-pending-batch-cap-scout/cli/2026-01-06T02-44-52-219Z-5e63a232/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0937-metrics-pending-batch-cap/cli/2026-01-06T02-47-08-254Z-23dd2c54/manifest.json`, `docs/TASKS.md`, `.agent/task/0937-metrics-pending-batch-cap.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0937-metrics-pending-batch-cap/metrics.json`, `out/0937-metrics-pending-batch-cap/state.json`.

### Discovery (Diagnostics + RLM)
- [x] Diagnostics + RLM runs captured with hotspot summary - Evidence: `.runs/0937-metrics-pending-batch-cap/cli/2026-01-06T02-48-59-706Z-a30d6abb/manifest.json`, `.runs/0937-metrics-pending-batch-cap/cli/2026-01-06T02-50-54-534Z-79b272a3/manifest.json`, `tasks/tasks-0937-metrics-pending-batch-cap.md`.

### Implementation
- [x] Targeted performance fix + tests applied - Evidence: code changes, `.runs/0937-metrics-pending-batch-cap/cli/2026-01-06T03-45-37-676Z-6e49461f/manifest.json`.

### Validation + Handoff
- [x] Implementation-gate manifest captured - Evidence: `.runs/0937-metrics-pending-batch-cap/cli/2026-01-06T03-45-37-676Z-6e49461f/manifest.json`.

## Hotspot Summary (RLM)
- Batched pending merges now accumulate all pending lines in memory before a single append; large backlogs can spike memory usage.
- If a process crashes after append but before pending file deletions, the duplication blast radius spans the entire batch.
- A single large append increases the chance of partial/truncated line writes during failures.

## Candidate fixes
- Add batch caps (bytes/lines) and flush incrementally while preserving filename order.
- Keep aggregate recomputation timing unchanged (single update after final merge).
- Add targeted tests for cap behavior and ordering preservation.

## Relevant Files
- `orchestrator/src/cli/metrics/metricsAggregator.ts`
- `orchestrator/src/cli/metrics/metricsRecorder.ts`
- `orchestrator/tests/MetricsAggregator.test.ts`

## Notes
- Spec Requirements: performance work requires a mini-spec; keep `last_review` current.
- Approvals Needed: PRD approval captured in `tasks/index.json` gate metadata before implementation.
- Subagent usage (required): capture at least one subagent manifest under `.runs/0937-metrics-pending-batch-cap-*/cli/<run-id>/manifest.json`.
