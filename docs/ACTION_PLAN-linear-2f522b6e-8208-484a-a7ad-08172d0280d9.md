# ACTION_PLAN - CO-554 Rolling Active-Spec Expiry Repeat Prevention

1. Create workpad, record parallelization decision, and launch the docs-packet child lane.
2. Reproduce the Apr 17 strict non-dry `node scripts/spec-guard.mjs` failure.
3. Verify each Apr 17 row from live Linear issue-context and classify terminal rows.
4. Reclassify terminal source specs inactive `done` and archive matching docs freshness registry rows.
5. Update `docs:freshness:maintain` so active spec pre-expiry is blocking owner-action evidence.
6. Add focused regression coverage for pre-expiry priority, owner verification, owner-action evidence, repo-gate blocking, and missing diff-base precedence.
7. Run validation and standalone/elegance review.
8. Open a draft PR only if remaining repo-wide blockers prevent review handoff.

## Current Result
- Apr 17 strict `spec-guard` blocker is cleared locally by evidence-backed terminal reclassification.
- Active spec pre-expiry now emits `block_spec_guard_pre_expiry`.
- Draft PR remains blocked by repo-wide `CO-522` docs freshness owner debt until review-state preconditions can be met.

## CO-382 Fallback Decision Table
- Large-refactor check: no new fallback mechanism; CO-554 removes stale active-spec lifecycle drift while keeping strict spec-guard authoritative.
- Minor-seam decision: bounded seam accepted because active pre-expiry specs now block through docs:freshness:maintain before hard expiry.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active spec lifecycle freshness | Completed or rolling active spec metadata can remain active until unrelated strict spec-guard jobs hit expiry | remove fallback | CO-554 | Apr 17 cohort reached strict spec-guard boundary after CO-543 | 2026-04-17 | 2026-05-18 | N/A after removal | Terminal specs are inactive done and active pre-expiry cohorts block through docs:freshness:maintain owner action | node scripts/spec-guard.mjs; docs-freshness-maintain regression |
