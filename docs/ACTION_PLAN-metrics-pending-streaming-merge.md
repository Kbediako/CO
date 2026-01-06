# Action Plan — Metrics Pending Streaming Merge

## Status Snapshot
- Current Phase: Discovery
- Run Manifest Link: `.runs/0938-metrics-pending-streaming-merge/cli/2026-01-06T04-18-29-923Z-d41abeeb/manifest.json`
- Metrics / State Snapshots: `.runs/0938-metrics-pending-streaming-merge/metrics.json`, `out/0938-metrics-pending-streaming-merge/state.json`

## Milestones & Tasks
1. Discovery + Baseline
   - Run subagent diagnostics and main diagnostics.
   - Run RLM pipeline with a streaming-merge / oversized-file goal.
   - Capture hotspot summary and candidate fix list.
2. Targeted Fix
   - Stream pending `.jsonl` files line-by-line with mid-file caps.
   - Skip whitespace-only lines and preserve ordering.
   - Preserve existing aggregate recomputation timing.
3. Validation + Handoff
   - Run implementation gate (spec-guard -> build -> lint -> test -> docs checks -> diff budget -> review).
   - Update task mirrors and evidence links.

## Risks & Mitigations
- Risk: Data loss if batch append fails. Mitigation: only remove pending files after successful append.
- Risk: Ordering drift. Mitigation: preserve filename sort order and line order.
