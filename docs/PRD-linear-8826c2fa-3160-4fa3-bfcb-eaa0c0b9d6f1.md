# PRD: CO-553 docs freshness policy capacity cleanup

last_review: 2026-05-17

## Summary
CO-553 clears the live `docs:freshness:maintain` handoff blocker where the strict maintenance gate reports `block_policy_over_budget` with `current_entries=470`, `max_entries=300`, `current_cohorts=37`, and `max_cohorts=2`. The lane must reduce or correctly classify historical task packet capacity debt without weakening the gate, changing limits, deleting history, or blindly bumping review dates.

## User Request Translation
- Clear the owner-routed `docs:freshness:maintain` policy capacity debt surfaced after CO-522 restored live canonical owner routing.
- Keep `CO-522` non-terminal as the live `docs:freshness:maintain` owner anchor until the canonical owner model no longer depends on issue terminality.
- Make `co-status` expose enough budget anatomy for operators to distinguish owner, blocker, entry excess, cohort excess, expired entries, terminal lifecycle paths, and blocking changed paths.

## Protected Terms
- `docs:freshness`
- `docs:freshness:maintain`
- `block_policy_over_budget`
- `policy_capacity_status`
- `current_entries=470`
- `max_entries=300`
- `current_cohorts=37`
- `max_cohorts=2`
- `CO-522`
- `CO-552`
- live remediation issue
- canonical owner anchor
- no date bump
- no gate weakening

## Non-Goals
- Do not weaken or bypass `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, docs catalog, registry validation, or CI gates.
- Do not raise freshness policy capacity limits to silence the blocker.
- Do not delete historical completed docs merely to lower counts.
- Do not blindly bump `last_review` for historical packet rows.
- Do not rework CO-522 PR #795.
- Do not change CO-490, CO-444, or broad owner-model architecture unless live evidence makes it directly required for this capacity cleanup.

## CO-382 Fallback Decision Table
Large-refactor check: CO-553 stays scoped to docs freshness capacity/actionability while CO-552 owns the broader owner/reconciler architecture.
Minor-seam decision: the bounded seam change is acceptable because it removes hidden/non-actionable freshness debt rather than adding a retained fallback.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` capacity/actionability | Historical capacity and rolling-current actionability seam that let rows look clean or non-actionable under owner/capacity routing | remove fallback | CO-553 | Current direct-action docs and non-candidate rolling rows can hide or block without path/action evidence. | 2026-05-17 | 2026-05-17 | N/A after removal | Live capacity classification surfaces stale current docs and rolling non-candidate current docs as blocking action evidence. | `npx vitest run --config vitest.config.core.ts tests/docs-freshness-maintain.spec.ts`; parent stale/rolling probe; `node scripts/spec-guard.mjs --dry-run`; `npm run build`. |

## Not Done If
- `docs:freshness:maintain` still exits with `block_policy_over_budget` for the same unexplained capacity debt.
- The fix changes limits instead of reducing or correctly classifying debt.
- CO-522 is marked terminal while the current docs freshness owner model still depends on it.
- `co-status` hides owner, blocker, entry excess, cohort excess, expired entries, terminal lifecycle paths, or blocking changed paths.
- Historical rows are silently deleted or blindly date-bumped.

## Acceptance Criteria
- `node scripts/docs-freshness-maintain.mjs --check --format json` returns a deterministic non-over-budget result after the cleanup.
- `policy_capacity_status.current_entries <= policy_capacity_status.max_entries`, `policy_capacity_status.current_cohorts <= policy_capacity_status.max_cohorts`, `expired_entries=0`, `over_entry_budget=false`, and `over_cohort_budget=false`, unless a reviewed spec change narrows active capacity while preserving fail-closed behavior.
- `blocking_changed_paths=0` is not treated as a waiver for global handoff blocking.
- CO-522 remains the non-terminal canonical owner anchor.
- `co-status` shows budget anatomy for capacity blockers.

## Validation
- `node scripts/docs-freshness-maintain.mjs --check --format json`
- `npm run docs:freshness`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- focused docs freshness maintain tests
- current `co-status` proof
