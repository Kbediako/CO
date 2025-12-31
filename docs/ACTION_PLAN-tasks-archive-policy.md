# Action Plan — Tasks Archive Policy (Task 0924)

## Status Snapshot
- Current Phase: Implementation complete
- Run Manifest Link (pre-change docs-review): `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-13-05-921Z-731779ca/manifest.json`
- Run Manifest Link (post-change docs-review): `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-33-03-522Z-3a356439/manifest.json`
- Run Manifest Link (implementation-gate): `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-33-41-190Z-792bce37/manifest.json`
- Approvals / Escalations: record in `tasks/index.json`

## Evidence Notes
- Pre-change docs-review used `DELEGATION_GUARD_OVERRIDE_REASON` because the task was not yet registered in `tasks/index.json`.
- Archive payloads are stored under `out/<task-id>/TASKS-archive-YYYY.md` prior to committing to the archive branch.
- Diff budget override recorded in the implementation-gate manifest for the archive policy + tooling changes.
- Archive branch updated at commit `e2ac1a3` (task-archives: docs/TASKS-archive-2025.md).

## Milestones & Tasks
1. Planning + collateral
   - Draft PRD, tech spec, action plan, checklist, and mini-spec.
   - Update `tasks/index.json` and `docs/TASKS.md` mirrors.
   - Capture docs-review manifest (pre-change).
2. Archive policy + tooling
   - Add `docs/tasks-archive-policy.json` and archive script.
   - Update `docs/TASKS.md` with archive index and apply the first archive pass.
3. Validation + handoff
   - Run docs-review after changes and record manifest evidence.
   - Run implementation-gate and record manifest evidence.
   - Run a review-agent docs-review subtask.
4. Archive branch update
   - Commit archive payload to the `task-archives` branch.

## Risks & Mitigations
- Risk: Not enough eligible tasks to archive when the file exceeds the threshold.
  - Mitigation: fail fast with a clear error so maintainers can review threshold or selection rules.
- Risk: Archive branch drifts from main snapshots.
  - Mitigation: update the archive branch immediately after archiving on main.

## Next Review
- Date: Not scheduled
- Agenda: confirm threshold, archive branch placement, and initial archive contents.
