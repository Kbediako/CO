# CO-553 Task Checklist

last_review: 2026-05-17

## Scope
- [x] Read live Linear issue context and move Ready to In Progress.
- [x] Create the single active Codex workpad.
- [x] Record a parallelization decision and launch the `capacity-tests` same-issue child lane.
- [x] Create and register the docs-first packet.
- [x] Implement active policy capacity classification and status anatomy.
- [x] Reclassify historical packet/mirror/report freshness debt without deleting history.
- [x] Address standalone-review P2 by keeping non-terminal 0959/0960 task packets active and correcting completed historical task lifecycle metadata.
- [x] Address standalone-review P2 by carrying archived rows with explicit non-terminal task status through the upstream `docs:freshness` report.
- [x] Address standalone-review P1 by routing unarchived stale rows with terminal task status to terminal lifecycle debt instead of filtering them out.
- [x] Address standalone-review P1 by applying the same terminal task-status lifecycle routing to rows already reported as rolling cohort entries.
- [x] Run focused and required validation.
- [x] Complete elegance review.
- [x] Complete standalone review waiver and manual correctness/regression/missing-tests review.
- [ ] Complete PR handoff and ready-review drain.

## Acceptance Criteria Mirror
- [x] `docs:freshness:maintain` no longer returns `block_policy_over_budget` for the same capacity debt.
- [x] `policy_capacity_status` is non-over-budget or justified by reviewed active capacity semantics.
- [x] `blocking_changed_paths=0` is not treated as a waiver.
- [x] CO-522 remains the non-terminal owner anchor.
- [x] `co-status` exposes owner, blocker, entry excess, cohort excess, expired entries, terminal lifecycle paths, and blocking changed paths.

## Validation Mirror
- [x] `node scripts/docs-freshness-maintain.mjs --check --format json`
- [x] `npm run docs:freshness`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run docs:check`
- [x] focused docs freshness tests
- [x] current `co-status` proof
- [x] standalone review waiver plus manual fallback review
