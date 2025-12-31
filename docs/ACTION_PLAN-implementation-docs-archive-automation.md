# Action Plan — Implementation Docs Archive Automation (Task 0926)

## Status Snapshot
- Current Phase: Complete
- Run Manifest Link (pre-change docs-review): `.runs/0926-implementation-docs-archive-automation/cli/2025-12-31T05-58-03-469Z-748bdbc3/manifest.json`
- Run Manifest Link (post-change docs-review): `.runs/0926-implementation-docs-archive-automation/cli/2025-12-31T06-21-23-157Z-aac3d325/manifest.json`
- Run Manifest Link (implementation-gate): `.runs/0926-implementation-docs-archive-automation/cli/2025-12-31T06-22-12-129Z-8d132792/manifest.json`
- Review Agent Manifest Link: `.runs/0926-implementation-docs-archive-automation-review/cli/2025-12-31T06-20-44-602Z-0e74240c/manifest.json`
- Approvals / Escalations: record in `tasks/index.json`

## Evidence Notes
- Pre-change docs-review used `DELEGATION_GUARD_OVERRIDE_REASON` because the task was not yet registered in `tasks/index.json`.
- Initial archive scan reported 0 stray candidates; report: `out/0926-implementation-docs-archive-automation/docs-archive-report.json`.

## Milestones & Tasks
1. Planning + collateral
   - Draft PRD, tech spec, action plan, checklist, and mini-spec.
   - Update `tasks/index.json` and `docs/TASKS.md` mirrors.
   - Capture docs-review manifest (pre-change).
2. Archive automation + policy
   - Add implementation-docs archive policy and script.
   - Add GitHub Actions workflow to archive docs and open a PR.
   - Update agent guidance and tasks archive policy threshold.
3. Validation + handoff
   - Run docs-review after changes and record manifest evidence.
   - Run implementation-gate and record manifest evidence.
   - Run a review-agent docs-review subtask.

## Risks & Mitigations
- Risk: Archiving removes needed context from main.
  - Mitigation: keep stubs with archive links and avoid archiving active tasks.
- Risk: Registry mismatches after stubbing.
  - Mitigation: update docs-freshness registry as part of the archive script.

## Next Review
- Date: Not scheduled
- Agenda: confirm archive thresholds, stub format, and workflow triggers.
