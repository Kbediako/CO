# Task Mirror - linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0

- Linear Issue: `CO-544` / `c8f25aac-5bc5-4210-8fc5-a143d6b14df0`
- Task registry id: `20260516-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0`
- Primary checklist: `tasks/tasks-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- PRD: `docs/PRD-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- TECH_SPEC: `tasks/specs/linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0.md`

## Current Scope
- Release/downgrade rehydrated accepted `provider_issue_rehydration_pending_revalidation` claims when live Linear state is non-runnable.
- Preserve fail-closed pending revalidation when live evidence is unavailable.
- Distinguish cached pending revalidation from live active workers in `co-status` and `control-host freshness-gauge`.
- Add CO-510/CO-512-shaped stale cached `In Progress` with live `Blocked` regression coverage.

## Status
- [x] Live issue-context read.
- [x] Workpad created with decomposition matrix.
- [x] Exactly one `linear parallelization` decision recorded.
- [x] Docs-first packet created.
- [x] Pre-implementation docs-review fallback recorded: `.runs/linear-c8f25aac-5bc5-4210-8fc5-a143d6b14df0/cli/2026-05-16T06-53-01-659Z-cca3905f/manifest.json` stopped on existing CO-522 docs-freshness capacity debt with no CO-544 blocking changed paths.
- [x] Implementation and focused validation.
- [x] Elegance/minimality review.
- [x] Parent build and gpt-5.5/xhigh standalone review passed.
- [x] Final closeout guards recorded; `docs:freshness` remains blocked by repo-wide stale-doc baseline debt outside CO-544.
- [x] Final workpad refresh.

## Not Done If
- A live non-runnable issue still consumes active WIP through a rehydrated accepted pending-revalidation claim.
- Missing live evidence fail-opens or silently clears the stale claim.
- Status surfaces hide the issue without fixing supported provider-intake/control-host logic.
- The fix relies on manual `provider-intake-state.json` edits or CO-510/CO-512 special casing.
