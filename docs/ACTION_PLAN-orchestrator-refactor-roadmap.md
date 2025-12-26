# Action Plan - Orchestrator Refactor Roadmap (Task 0913)

## Status Snapshot
- Current Phase: Planning collateral + docs-review.
- Run Manifest Link: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json` _(status: `succeeded`)._
- Metrics / State Snapshots: `.runs/0913-orchestrator-refactor-roadmap/metrics.json` (JSONL; one entry per run), `out/0913-orchestrator-refactor-roadmap/state.json` (latest snapshot)
- Note: For the cited docs-review evidence run, metrics record `control_plane_status` as `failed` and the run still `succeeded`.
- Approvals / Escalations: None expected for doc-only work; safe `read/edit/run/network` profile.

## Milestones & Tasks
1. Milestone: Docs collateral + review evidence
   - Tasks:
     - Draft PRD, tech spec, mini-spec, and checklist.
     - Run docs-review gate and record manifest evidence in mirrors (`docs/TASKS.md`, `.agent/task`, `tasks/index.json`).
2. Milestone: Manifest correctness + atomic write safety (Phase 1 implementation)
   - Tasks:
     - Add regression tests for `executePipeline` failure finalization and atomic temp path uniqueness.
     - Refactor manifest entry updates to eliminate stale-reference hazards.
3. Milestone: Single-writer persistence + bounded exec telemetry (Phases 2–3 implementation)
   - Tasks:
     - Introduce a coalescing persister and route manifest writes through it.
     - Add bounded event capture policy (opt-in first), preserving full logs/handles.
4. Milestone: Policy consolidation + hygiene (Phases 4–5 implementation)
   - Tasks:
     - Consolidate execution mode resolution behind one helper without behavior changes.
     - Reduce metrics bloat and remove `process.env` leakage where feasible, with compatibility windows.

## Risks & Mitigations
- Risk: Refactors accidentally change external behavior.
  - Mitigation: add targeted tests first; land in small PRs; use opt-in flags for behavior-adjacent changes.
- Risk: Reviewer tools assume full event capture.
  - Mitigation: keep full `.ndjson` logs; make bounded capture opt-in until validated.

## Next Review
- Date: 2025-12-26
- Agenda: Confirm collateral completeness, approve phased plan, and validate docs-review evidence is recorded.
