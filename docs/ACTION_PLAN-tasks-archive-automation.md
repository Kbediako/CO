# Action Plan — Tasks Archive Automation (Task 0925)

## Status Snapshot
- Current Phase: Complete
- Run Manifest Link (pre-change docs-review): `.runs/0925-tasks-archive-automation/cli/2025-12-31T04-49-55-774Z-bf7c0600/manifest.json`
- Run Manifest Link (post-change docs-review): `.runs/0925-tasks-archive-automation/cli/2025-12-31T05-04-46-898Z-82dd0288/manifest.json`
- Run Manifest Link (implementation-gate): `.runs/0925-tasks-archive-automation/cli/2025-12-31T05-05-34-058Z-6b103aff/manifest.json`
- Review Agent Manifest Link: `.runs/0925-tasks-archive-automation-review/cli/2025-12-31T05-03-45-338Z-0dcb0ceb/manifest.json`
- Approvals / Escalations: record in `tasks/index.json`

## Evidence Notes
- Pre-change docs-review used `DELEGATION_GUARD_OVERRIDE_REASON` because the task was not yet registered in `tasks/index.json`.
- Archive payloads updated on the `task-archives` branch at commit `94a1262` (docs/TASKS-archive-2025.md).

## Milestones & Tasks
1. Planning + collateral
   - Draft PRD, tech spec, action plan, checklist, and mini-spec.
   - Update `tasks/index.json` and `docs/TASKS.md` mirrors.
   - Capture docs-review manifest (pre-change).
2. Automation workflow + safety fix
   - Add a GitHub Actions workflow to run `scripts/tasks-archive.mjs`, push archive payloads, and open a PR.
   - Harden snapshot anchoring to avoid archiving mismatched headers.
   - Update agent guidance to describe the automated flow.
3. Validation + handoff
   - Run docs-review after changes and record manifest evidence.
   - Run implementation-gate and record manifest evidence.
   - Run a review-agent docs-review subtask.

## Risks & Mitigations
- Risk: Workflow pushes a malformed archive payload or misses updates.
  - Mitigation: keep the archive script deterministic, enforce dry-run during local checks, and require PR review before merge.
- Risk: Snapshot anchoring mismatch removes unrelated content.
  - Mitigation: validate header keys and fall back to `docs-sync` boundaries when mismatched.

## Next Review
- Date: Not scheduled
- Agenda: confirm workflow triggers, branch updates, and archive payload integrity.
