# Task 0936 - Metrics Pending IO Batching

- MCP Task ID: `0936-metrics-pending-io-batching`
- Primary PRD: `docs/PRD-metrics-pending-io-batching.md`
- Tech Spec: `docs/TECH_SPEC-metrics-pending-io-batching.md`
- Action Plan: `docs/ACTION_PLAN-metrics-pending-io-batching.md`
- Mini-spec: `tasks/specs/0936-metrics-pending-io-batching.md`
- Run Manifest (docs review): `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-06-48-284Z-792d4ebb/manifest.json`
- Metrics/State: `.runs/0936-metrics-pending-io-batching/metrics.json`, `out/0936-metrics-pending-io-batching/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-metrics-pending-io-batching.md`, `docs/TECH_SPEC-metrics-pending-io-batching.md`, `docs/ACTION_PLAN-metrics-pending-io-batching.md`, `tasks/tasks-0936-metrics-pending-io-batching.md`, `tasks/specs/0936-metrics-pending-io-batching.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0936-metrics-pending-io-batching-scout/cli/2026-01-06T01-05-30-562Z-dfa0b094/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-06-48-284Z-792d4ebb/manifest.json`, `docs/TASKS.md`, `.agent/task/0936-metrics-pending-io-batching.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0936-metrics-pending-io-batching/metrics.json`, `out/0936-metrics-pending-io-batching/state.json`.

### Discovery (Diagnostics + RLM)
- [x] Diagnostics + RLM runs captured with hotspot summary - Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-09-05-710Z-4370fedb/manifest.json`, `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-10-29-482Z-91498de9/manifest.json`, `tasks/tasks-0936-metrics-pending-io-batching.md`.

### Implementation
- [x] Targeted performance fix + tests applied - Evidence: code changes, `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-50-32-842Z-b559ee97/manifest.json`.

### Validation + Handoff
- [x] Implementation-gate manifest captured - Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-50-32-842Z-b559ee97/manifest.json`.
- [x] Validation: `npm run docs:check` passes. Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-50-32-842Z-b559ee97/manifest.json`.
- [x] Validation: `npm run docs:freshness` passes. Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-50-32-842Z-b559ee97/manifest.json`, `out/0936-metrics-pending-io-batching/docs-freshness.json`.
- [x] Validation: `npm run review` executed with NOTES recorded. Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-50-32-842Z-b559ee97/manifest.json`. NOTES: "Goal: Address docs registry duplicates + revalidate docs checks for 0936 | Summary: remove duplicate entries, rerun implementation-gate for docs:check/docs:freshness evidence | Risks: none known | Questions (optional): none".

## Hotspot Summary (RLM)
- `mergePendingMetricsEntries` drains each pending `.jsonl` file one by one via `drainMetricsEntryFile`, causing per-file `readFile` + `appendFile` + `rm` I/O and multiple `metrics.json` appends per pass.
- `mergePendingMetricsEntries` performs two passes (and readdir/stat sweeps) per invocation to catch late arrivals; each pass repeats filesystem scans and temp cleanup.
- `appendMetricsEntry` currently calls `mergePendingMetricsEntries` before and after the new entry, then runs `updateMetricsAggregates` and may run it again if new pending entries appeared, which re-reads `metrics.json` and rewrites multiple aggregate artifacts twice.

## Candidate fixes
- Batch pending payloads: collect non-empty lines from sorted pending files and append a combined payload once per merge pass; only remove files after a successful append.
- Defer aggregate recomputation: in `appendMetricsEntry`, merge pending before/after the new entry, but call `updateMetricsAggregates` only once after the final merge.
- (Optional) Add a safe size cap (e.g., max bytes or max lines) to flush batches incrementally without changing ordering guarantees.

## Relevant Files
- `orchestrator/src/cli/metrics/metricsAggregator.ts`
- `orchestrator/src/cli/metrics/metricsRecorder.ts`
- `orchestrator/tests/MetricsAggregator.test.ts`

## Notes
- Spec Requirements: performance work requires a mini-spec; keep `last_review` current.
- Approvals Needed: PRD approval captured in `tasks/index.json` gate metadata before implementation.
- Subagent usage (required): capture at least one subagent manifest under `.runs/0936-metrics-pending-io-batching-*/cli/<run-id>/manifest.json`.
