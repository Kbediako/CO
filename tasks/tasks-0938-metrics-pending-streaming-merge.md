# Task 0938 - Metrics Pending Streaming Merge

- MCP Task ID: `0938-metrics-pending-streaming-merge`
- Primary PRD: `docs/PRD-metrics-pending-streaming-merge.md`
- Tech Spec: `docs/TECH_SPEC-metrics-pending-streaming-merge.md`
- Action Plan: `docs/ACTION_PLAN-metrics-pending-streaming-merge.md`
- Mini-spec: `tasks/specs/0938-metrics-pending-streaming-merge.md`
- Run Manifest (docs review): `.runs/0938-metrics-pending-streaming-merge/cli/2026-01-06T04-14-49-312Z-de71c874/manifest.json`
- Metrics/State: `.runs/0938-metrics-pending-streaming-merge/metrics.json`, `out/0938-metrics-pending-streaming-merge/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-metrics-pending-streaming-merge.md`, `docs/TECH_SPEC-metrics-pending-streaming-merge.md`, `docs/ACTION_PLAN-metrics-pending-streaming-merge.md`, `tasks/tasks-0938-metrics-pending-streaming-merge.md`, `tasks/specs/0938-metrics-pending-streaming-merge.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0938-metrics-pending-streaming-merge-scout/cli/2026-01-06T04-11-41-475Z-32bc0c5d/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0938-metrics-pending-streaming-merge/cli/2026-01-06T04-14-49-312Z-de71c874/manifest.json`, `docs/TASKS.md`, `.agent/task/0938-metrics-pending-streaming-merge.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0938-metrics-pending-streaming-merge/metrics.json`, `out/0938-metrics-pending-streaming-merge/state.json`.

### Discovery (Diagnostics + RLM)
- [x] Diagnostics + RLM runs captured with hotspot summary - Evidence: `.runs/0938-metrics-pending-streaming-merge/cli/2026-01-06T04-17-10-186Z-42eee7a1/manifest.json`, `.runs/0938-metrics-pending-streaming-merge/cli/2026-01-06T04-18-29-923Z-d41abeeb/manifest.json`, `tasks/tasks-0938-metrics-pending-streaming-merge.md`.

### Implementation
- [x] Targeted performance fix + tests applied - Evidence: `.runs/0938-metrics-pending-streaming-merge/cli/2026-01-06T05-31-44-670Z-321b455e/manifest.json`.

### Validation + Handoff
- [x] Implementation-gate manifest captured - Evidence: `.runs/0938-metrics-pending-streaming-merge/cli/2026-01-06T05-31-44-670Z-321b455e/manifest.json`.

## Hotspot Summary (RLM)
- Pending merges still read entire files into memory; a single oversized `.jsonl` can bypass batch caps.
- Whitespace-only lines can propagate into metrics and break JSON parsing later.
- Streaming line-by-line with mid-file flushes can bound memory but may widen duplication window for multi-line files.

## Candidate fixes
- Stream pending files line-by-line and flush mid-file on cap boundaries.
- Skip whitespace-only lines in pending merges.
- Ignore whitespace-only lines when loading `metrics.json` for aggregates.
- Ensure baseline creation precedes dependent aggregate writes.
- Keep aggregate recomputation timing unchanged (single update after final merge).
- Add targeted tests for mid-file flushing and whitespace filtering.

## Relevant Files
- `orchestrator/src/cli/metrics/metricsAggregator.ts`
- `orchestrator/src/cli/metrics/metricsRecorder.ts`
- `orchestrator/tests/MetricsAggregator.test.ts`

## Notes
- Spec Requirements: performance work requires a mini-spec; keep `last_review` current.
- Approvals Needed: PRD approval captured in `tasks/index.json` gate metadata before implementation.
- Subagent usage (required): capture at least one subagent manifest under `.runs/0938-metrics-pending-streaming-merge-*/cli/<run-id>/manifest.json`.
