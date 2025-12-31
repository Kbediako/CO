# Action Plan — Docs Freshness Date Validation (Task 0923)

## Status Snapshot
- Current Phase: Complete
- Run Manifest Link (pre-change docs-review): `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-34-45-786Z-8652d794/manifest.json`
- Run Manifest Link (post-change docs-review): `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-40-46-229Z-1f8b81a5/manifest.json`
- Run Manifest Link (implementation-gate): `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-41-19-365Z-8a773ab1/manifest.json`
- Approvals / Escalations: record in `tasks/index.json`

## Evidence Notes
- Pre-change docs-review used `DELEGATION_GUARD_OVERRIDE_REASON` because the task was not yet registered in `tasks/index.json`.
- `out/<task-id>/docs-freshness.json` stores the audit report output.

## Milestones & Tasks
1. Planning + collateral
   - Draft PRD, tech spec, action plan, checklist, and mini-spec.
   - Update `tasks/index.json` and `docs/TASKS.md` mirrors.
   - Capture docs-review manifest (pre-change).
2. Strict date validation
   - Update `scripts/docs-freshness.mjs` to reject malformed `last_review` dates.
   - Update doc references to note strict validation behavior.
3. Validation + handoff
   - Run docs-review after changes and record manifest evidence.
   - Run implementation-gate and record manifest evidence.
   - Capture a review-agent run as subagent evidence.

## Risks & Mitigations
- Risk: Existing registry entries include malformed dates and will now fail.
  - Mitigation: validate existing registry dates during implementation and correct any invalid entries found.

## Next Review
- Date: Not scheduled
- Agenda: confirm strict date validation logic and audit outputs.
