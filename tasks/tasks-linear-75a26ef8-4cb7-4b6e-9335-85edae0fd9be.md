# Task Checklist - linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be

- Linear issue: `CO-318`
- PRD: `docs/PRD-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`
- TECH_SPEC: `tasks/specs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, checklist mirror, and registry entries exist for `CO-318`.
- [x] The packet preserves `node scripts/spec-guard.mjs`, `Core Lane`, `last_review`, current `origin/main`, and the exact six stale spec paths.
- [x] Pre-implementation docs-review evidence is recorded for this packet, with the fallback documented when the rerun stopped on the issue-owned stale-spec freshness seam plus older historical baseline debt.

## Implementation
- [x] Current-main failure evidence for the exact six stale specs is preserved.
- [x] The six stale task specs are re-reviewed and refreshed without widening the stale set.
- [x] The lane keeps `spec-guard` policy and `CO-314` release-workflow behavior unchanged.

## Validation
- [x] `node scripts/spec-guard.mjs` passes on the blocker-fix branch.
- [x] Dependent PR unblock evidence is captured for the same baseline seam.
- [x] Workpad and packet mirrors reflect the final validation outcome.
