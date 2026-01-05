# Action Plan — ExperienceStore JSONL Line Repair

## Status Snapshot
- Current Phase: Planning
- Run Manifest Link: `.runs/0933-orchestrator-experience-jsonl-repair/cli/<run-id>/manifest.json`
- Metrics / State Snapshots: `.runs/0933-orchestrator-experience-jsonl-repair/metrics.json`, `out/0933-orchestrator-experience-jsonl-repair/state.json`

## Milestones & Tasks
1. Discovery + Baseline
   - Run subagent diagnostics and main diagnostics.
   - Run RLM pipeline with a JSONL integrity goal.
   - Capture hotspot summary and candidate fix.
2. Targeted Fix
   - Add tail newline check in `ExperienceStore.recordBatch`.
   - Add a regression test for partial-line append.
3. Validation + Handoff
   - Run implementation gate (spec-guard → build → lint → test → docs checks → diff budget → review).
   - Update task mirrors and evidence links.

## Risks & Mitigations
- Risk: extra I/O per append. Mitigation: limit to a single-byte tail read.
- Risk: unexpected file errors. Mitigation: propagate non-ENOENT errors and keep diffs small.
