# Task Mirror - linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d

- Linear Issue: `CO-546` / `29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- Task registry id: `20260516-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- Primary checklist: `tasks/tasks-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- PRD: `docs/PRD-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- TECH_SPEC: `tasks/specs/linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`

## Current Scope
- Attach live Linear issue metadata to rehydrated accepted `provider_issue_rehydration_pending_revalidation` claims.
- Release live non-runnable stale pending claims out of active WIP.
- Preserve fail-closed pending state when live evidence is unavailable.
- Add focused CO-510/CO-512-shaped regression coverage.

## Status
- [x] Live post-CO-544 validation evidence captured.
- [x] Workpad created.
- [x] Parallelization decision recorded.
- [x] Docs-first packet created.
- [x] Implementation and validation.
- [ ] Review handoff.

## Validation Evidence
- Build, lint, full core test, docs:check, repo:stewardship, diff-budget, and pack:smoke passed.
- Focused pending-revalidation and full ProviderIssueHandoff regressions passed.
- `docs:freshness` remains blocked by existing repo-wide stale-doc baseline debt, not missing CO-546 packet coverage.

## Not Done If
- Cached `issue_state=In Progress` remains active for a live `Blocked` pending-revalidation claim.
- Missing live evidence fail-opens.
- The lane relaunches blocked issues or manually edits `provider-intake-state.json`.
