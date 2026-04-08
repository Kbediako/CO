# Action Plan — Metrics Pending IO Batching

## Status Snapshot
- Current Phase: Validation + Handoff
- Run Manifest Link: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-50-32-842Z-b559ee97/manifest.json`
- Metrics / State Snapshots: `.runs/0936-metrics-pending-io-batching/metrics.json`, `out/0936-metrics-pending-io-batching/state.json`

## Milestones & Tasks
1. Discovery + Baseline
   - Run subagent diagnostics and main diagnostics.
   - Run RLM pipeline with a metrics-aggregation latency goal.
   - Capture hotspot summary and candidate fix.
2. Targeted Fix
   - Batch pending metrics writes in `mergePendingMetricsEntries`.
   - Update `appendMetricsEntry` to recompute aggregates once after final merge.
3. Validation + Handoff
   - Run implementation gate (spec-guard -> build -> lint -> test -> docs checks -> diff budget -> review).
   - Update task mirrors and evidence links.

## Risks & Mitigations
- Risk: Data loss if batch append fails. Mitigation: only remove pending files after successful append.
- Risk: Ordering drift. Mitigation: preserve filename sort order.
