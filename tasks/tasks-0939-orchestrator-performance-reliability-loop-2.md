# Task 0939 - Orchestrator Performance & Reliability Loop 2

- MCP Task ID: `0939-orchestrator-performance-reliability-loop-2`
- Primary PRD: `docs/PRD-orchestrator-performance-reliability-loop-2.md`
- Tech Spec: `docs/TECH_SPEC-orchestrator-performance-reliability-loop-2.md`
- Action Plan: `docs/ACTION_PLAN-orchestrator-performance-reliability-loop-2.md`
- Mini-spec: `tasks/specs/0939-orchestrator-performance-reliability-loop-2.md`
- Run Manifest (docs review): `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T07-49-03-214Z-a31732c2/manifest.json`
- Metrics/State: `.runs/0939-orchestrator-performance-reliability-loop-2/metrics.json`, `out/0939-orchestrator-performance-reliability-loop-2/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-orchestrator-performance-reliability-loop-2.md`, `docs/TECH_SPEC-orchestrator-performance-reliability-loop-2.md`, `docs/ACTION_PLAN-orchestrator-performance-reliability-loop-2.md`, `tasks/tasks-0939-orchestrator-performance-reliability-loop-2.md`, `tasks/specs/0939-orchestrator-performance-reliability-loop-2.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2-scout/cli/2026-01-06T06-46-31-169Z-88ce91ef/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T07-49-03-214Z-a31732c2/manifest.json`, `docs/TASKS.md`, `.agent/task/0939-orchestrator-performance-reliability-loop-2.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0939-orchestrator-performance-reliability-loop-2/metrics.json`, `out/0939-orchestrator-performance-reliability-loop-2/state.json`.

### Discovery (Diagnostics + RLM)
- [x] Diagnostics + RLM runs captured with hotspot summary - Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T06-51-26-814Z-8229d14a/manifest.json`, `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T06-53-37-814Z-c285a360/manifest.json`, `tasks/tasks-0939-orchestrator-performance-reliability-loop-2.md`.

### Implementation
- [ ] Targeted performance/reliability fixes + tests/benchmarks applied - Evidence: code changes, `.runs/0939-orchestrator-performance-reliability-loop-2/cli/<run-id>/manifest.json`.

### Validation + Handoff
- [ ] Implementation-gate manifest captured - Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/<run-id>/manifest.json`.


## Hotspot Summary (RLM)
- Metrics aggregation does full-file reads each run: `appendMetricsEntry` calls `updateMetricsAggregates` in `orchestrator/src/cli/metrics/metricsRecorder.ts`, which uses `loadMetricsEntries` in `orchestrator/src/cli/metrics/metricsAggregator.ts` to read/parse the entire `metrics.json` (O(N) time + memory as history grows).

## Candidate fixes
- Stream `metrics.json` line-by-line and compute aggregates in one pass (avoid full in-memory arrays). Files: `orchestrator/src/cli/metrics/metricsAggregator.ts`. Tests: `orchestrator/tests/MetricsAggregator.test.ts`, `orchestrator/tests/MetricsAggregatorFlush.test.ts`.
- Optional incremental aggregation cache (defer to future loop unless streaming is insufficient): persist aggregate counters + last processed offset/line in a small `metrics/aggregate-state.json`, update on new lines with fallback to full rebuild. Files: `orchestrator/src/cli/metrics/metricsAggregator.ts`. Tests: `orchestrator/tests/MetricsAggregator.test.ts`.
- Use atomic writes for aggregate outputs (`baseline.json`, `post-rollout.json`, `completeness.json`, `per-epoch.json`, `mttr-delta.json`, `state.json`) via `writeJsonAtomic`/`writeAtomicFile`. Files: `orchestrator/src/cli/metrics/metricsAggregator.ts`, `orchestrator/src/utils/atomicWrite.ts`. Tests: `orchestrator/tests/MetricsAggregator.test.ts`.
- Optional rotation guard (defer to future loop): add `CODEX_METRICS_MAX_BYTES`/`CODEX_METRICS_MAX_LINES` to rotate `metrics.json` into timestamped segments while streaming all segments for aggregation. Files: `orchestrator/src/cli/metrics/metricsRecorder.ts`, `orchestrator/src/cli/metrics/metricsAggregator.ts`. Tests: `orchestrator/tests/MetricsAggregator.test.ts`.

## Relevant Files
- `orchestrator/src/cli/metrics/metricsAggregator.ts`
- `orchestrator/src/cli/metrics/metricsRecorder.ts`
- `orchestrator/tests/MetricsAggregator.test.ts`
- `orchestrator/tests/MetricsAggregatorFlush.test.ts`

## Notes
- Spec Requirements: performance work requires a mini-spec; keep `last_review` current.
- Approvals Needed: PRD approval captured in `tasks/index.json` gate metadata before implementation.
- Subagent usage (required): capture at least one subagent manifest under `.runs/0939-orchestrator-performance-reliability-loop-2-*/cli/<run-id>/manifest.json`.
