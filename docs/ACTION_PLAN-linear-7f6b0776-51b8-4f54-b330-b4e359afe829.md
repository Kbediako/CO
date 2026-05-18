# ACTION PLAN - CO-364 RLM GPT-5.5 Route Posture

## Summary
- Goal: align the RLM route defaults in `alignment.ts` with CO-352's merged CO-local `gpt-5.5` posture.
- Scope: docs-first packet, default constants, focused tests, local validation, draft PR.
- Assumptions: CO-352 is present on `origin/main`; route-specific defaults can move to `gpt-5.5` without changing generic downstream defaults.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `sentinel_model`, `high_reasoning_model`, `arbitration_model`, `gpt-5.5`, `xhigh`, `explorer_fast`, `spark exceptions`.
- Not done if: overrides regress, route defaults stay on `gpt-5.4`, or unrelated active-lane files are touched.
- Pre-implementation issue-quality review: approved for a narrow RLM route posture patch after inspecting `alignment.ts` and `RlmAlignment.test.ts`.

## Milestones & Sequencing
1. Create and register the CO-364 docs-first packet.
2. Update the RLM route default constants and focused tests.
3. Run focused tests, required gates, explicit minimality review, then commit/push and open a draft PR if green.

## Dependencies
- Latest `origin/main` with CO-352 merged.
- Existing Vitest RLM alignment coverage.

## Validation
- Checks / tests: focused RLM test, spec guard, build, repo test command, docs check, docs freshness, self-review.
- Rollback plan: revert the constant/test/docs packet commit if route posture must return to `gpt-5.4`.

## Risks & Mitigations
- Risk: accidentally broadening into generic default promotion. Mitigation: only change `DEFAULT_ALIGNMENT_POLICY.route` and direct tests.
- Risk: override behavior regression. Mitigation: add focused assertion for partial/full route override merging.

## Approvals
- Reviewer: parent worker self-review.
- Date: 2026-04-25.
