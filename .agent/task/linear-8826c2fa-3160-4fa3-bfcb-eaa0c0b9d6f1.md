# Agent Task: CO-553 docs freshness policy capacity cleanup

last_review: 2026-05-17

## Current Truth
- Linear issue: CO-553, `8826c2fa-3160-4fa3-bfcb-eaa0c0b9d6f1`.
- Baseline blocker was `docs:freshness:maintain` exiting with `freshness_decision=block_policy_over_budget`, `current_entries=470`, `max_entries=300`, `current_cohorts=37`, `max_cohorts=2`, and `expired_entries=0`.
- Current maintenance proof is clean: `policy_capacity_status.status=no_candidates`, `current_entries=0`, `current_cohorts=0`, `expired_entries=0`, and no entry/cohort excess.
- Owner anchor: CO-522 remains non-terminal and owner-routed (`Blocked` / started).

## Plan
- [x] Reproduce baseline and create workpad.
- [x] Launch focused same-issue child lane for capacity regression tests.
- [x] Register docs-first packet.
- [x] Implement active-capacity classifier and repo-gate/status anatomy.
- [x] Carry explicit non-terminal task lifecycle rows through upstream docs freshness reports before maintain filtering.
- [x] Route unarchived stale and rolling cohort rows with terminal task status to terminal lifecycle debt instead of treating them as excluded historical capacity.
- [x] Reclassify historical packet/mirror/report rows while keeping non-terminal task packets active and reviewed.
- [x] Finish elegance review.
- [x] Finish standalone review waiver and manual fallback review.
- [ ] Finish PR drain and review-state handoff.

## Guardrails
- No cap increases.
- No historical file deletion.
- No blind date bump for historical packet rows.
- No CO-522 terminal transition.
- No broad canonical owner architecture refactor.

## Required Validation
- [x] focused maintain and status tests
- [x] focused upstream docs freshness tests
- [x] `node scripts/docs-freshness-maintain.mjs --check --format json`
- [x] `npm run docs:freshness`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run docs:check`
- [x] current `co-status` proof
- [x] standalone review waiver plus manual fallback review
