# Action Plan — Metrics Pending Batch Cap

## Status Snapshot
- Current Phase: Implementation complete
- Run Manifest Link: `.runs/0937-metrics-pending-batch-cap/cli/2026-01-06T03-45-37-676Z-6e49461f/manifest.json`
- Metrics / State Snapshots: `.runs/0937-metrics-pending-batch-cap/metrics.json`, `out/0937-metrics-pending-batch-cap/state.json`

## Milestones & Tasks
1. Discovery + Baseline
   - Run subagent diagnostics and main diagnostics.
   - Run RLM pipeline with a batch-cap / memory-risk goal.
   - Capture hotspot summary and candidate fix list.
2. Targeted Fix
   - Add batch size caps (bytes/lines) in `mergePendingMetricsEntries` with incremental flush.
   - Preserve ordering and existing aggregate recomputation timing.
3. Validation + Handoff
   - Run implementation gate (spec-guard -> build -> lint -> test -> docs checks -> diff budget -> review).
   - Update task mirrors and evidence links.

## Risks & Mitigations
- Risk: Data loss if batch append fails. Mitigation: only remove pending files after successful append.
- Risk: Ordering drift. Mitigation: preserve filename sort order.
