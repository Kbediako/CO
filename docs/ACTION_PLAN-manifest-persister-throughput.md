# Action Plan — Manifest Persister Throughput

## Status Snapshot
- Current Phase: Validation + Handoff
- Run Manifest Link: `.runs/0935-manifest-persister-throughput/cli/2026-01-05T23-58-37-316Z-069c2fc7/manifest.json`
- Metrics / State Snapshots: `.runs/0935-manifest-persister-throughput/metrics.json`, `out/0935-manifest-persister-throughput/state.json`

## Milestones & Tasks
1. Discovery + Baseline
   - Run subagent diagnostics and main diagnostics.
   - Run RLM pipeline with a persistence-flush latency goal.
   - Capture hotspot summary and candidate fix.
2. Targeted Fix
   - Parallelize manifest + heartbeat writes in `ManifestPersister`.
   - Add tests for concurrent start and single-channel retry behavior.
3. Validation + Handoff
   - Run implementation gate (spec-guard -> build -> lint -> test -> docs checks -> diff budget -> review).
   - Update task mirrors and evidence links.

## Risks & Mitigations
- Risk: Error precedence changes. Mitigation: preserve manifest-first error selection and add tests.
- Risk: Retry semantics drift. Mitigation: re-dirty only failed channels and validate with tests.
