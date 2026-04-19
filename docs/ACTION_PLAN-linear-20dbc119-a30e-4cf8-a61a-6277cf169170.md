# ACTION_PLAN - CO: Reuse canonical owner issues before create-follow-up for recurring baseline debt

## Summary
- Goal: ship the narrow canonical-owner reuse bridge for recurring baseline follow-ups.
- Scope: docs-first packet, exact owner key output, `create-follow-up` reuse/stamp behavior, provider guidance, and regressions.
- Assumptions: existing Linear description search/query support is sufficient when constrained to exact machine markers and same team/project.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `baseline_cohort_id`, stable machine tuple, exact canonical-owner marker, `Done`, `Duplicate`, `Canceled`, and Apr 19 duplicate cluster wording.
- Not done if: the helper still creates duplicate open owners for the same key, uses terminal issues as active owners, or relies on title/body fuzzy matching.
- Pre-implementation issue-quality review: parent accepted the issue as a bounded bridge between existing CO-188 maintenance output and the follow-up mutation seam.

## Milestones & Sequencing
1. Bootstrap docs-first packet, workpad, Linear state, and same-issue tests child lane.
2. Implement maintenance-report canonical owner keys and exact marker helpers.
3. Implement `create-follow-up` canonical owner lookup, reuse, stamp-on-create, CLI flags, audit output, and provider guidance.
4. Accept/reconcile child-lane tests or add equivalent focused regressions if the child patch is unavailable.
5. Run docs-review, focused tests, full validation floor, standalone review, elegance review, PR attach, and ready-review drain.

## Dependencies
- Existing `linear create-follow-up` helper and provider Linear audit path.
- Existing docs freshness maintenance output and candidate cohort summarization.
- Same-issue child-lane test stream `followup-regression-tests`.

## Validation
- Checks / tests:
  - focused facade/CLI tests for canonical owner reuse and closed-owner non-reuse
  - `npm run docs:freshness:maintain -- --format json` shape check as needed
  - required repo validation floor before handoff
- Rollback plan: revert the helper/key additions and guidance changes; existing follow-up creation behavior remains the fallback.

## Risks & Mitigations
- Risk: exact marker lookup accidentally behaves like fuzzy duplicate detection.
  - Mitigation: search/filter only for the deterministic marker and enforce same team/project/open state in code.
- Risk: stale terminal issues get reused.
  - Mitigation: query excludes completed/canceled states and tests cover a closed CO-254-style owner.
- Risk: extra Linear requests strain shared budget.
  - Mitigation: keep the canonical owner query bounded and raise preflight minimum only when the optional key is supplied.

## Approvals
- Reviewer: parent provider worker.
- Date: 2026-04-19.
