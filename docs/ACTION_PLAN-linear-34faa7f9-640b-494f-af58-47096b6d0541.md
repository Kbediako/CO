# ACTION_PLAN - CO-491 retained released/not_active canceled metadata refresh

## Summary
- Goal: refresh stale retained released/not_active metadata when live Linear reports a terminal/canceled transition.
- Scope: provider-intake refresh logic, focused tests, docs packet, validation, PR handoff.
- Assumptions:
  - CO-470 is already `Duplicate` / `canceled`; this lane does not reopen or mutate it.
  - Persisted blocker-edge truth can safely act as a hint to re-read live Linear, not as the final same-issue metadata authority.
  - Still-open released/not_active recovery semantics remain required.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-292`
  - `CO-470`
  - `Duplicate/canceled`
  - `provider-intake-state.json`
  - retained `released` / `provider_issue_released:not_active` row
  - `issue_state=Blocked`
  - `issue_state_type=started`
  - `issue_updated_at` stale
  - live Linear `issue-context`
  - fresh blocker-edge truth
- Not done if:
  - retained released/not_active rows can keep stale started-state metadata after live Linear reports terminal/canceled
  - consumers can count those rows as active blockers without degraded marker or live-source refresh attempt
  - fix only handles CO-470
  - CO-459 or CO-476 scope is absorbed
- Pre-implementation issue-quality review:
  - CO-491 is concrete and narrow: repair a metadata refresh recurrence, not a projection or timeout owner.
  - The micro-task path is unavailable because exact provider-intake stale/cache semantics and adjacent-owner boundaries define correctness.
- Fallback / refactor decision:
  - `remove fallback`: stale terminal/canceled retained metadata must no longer be retained as started-state truth.
  - `justify retaining fallback`: still-open released/not_active recovery remains in scope only to preserve existing behavior.

## Milestones & Sequencing
1. Establish workflow state, workpad, decomposition matrix, and same-issue docs child-lane evidence.
2. Refresh docs packet against live CO-491 issue contract.
3. Inspect retained released/not_active refresh flow and existing tests.
4. Add focused regression for stale same-issue retained row plus persisted dependent blocker-edge `Duplicate` / `canceled` truth.
5. Implement smallest refresh-path change so persisted blocker-edge disagreement triggers live issue refresh.
6. Run focused tests and update task checklist/workpad.
7. Run required repo validation, standalone review, and elegance/minimality pass.
8. Open or update PR, attach it to CO-491, merge latest `origin/main`, wait for PR checks and `ready-review` drain, then hand off to review state.

## Dependencies
- Linear issue-context for CO-491 and practical live/current-main status checks.
- Existing provider-intake claim metadata and blocker-edge types.
- Adjacent owners:
  - CO-459 for stale top-level provider_intake projection
  - CO-476 for `/ui/data` timeout work
  - CO-470 remains incident evidence, not an implementation owner

## Validation
- Checks / tests:
  - focused ProviderIssueHandoff test for persisted blocker-edge terminal/canceled disagreement
  - retained released/not_active regression cluster
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `codex-orchestrator review`
  - elegance/minimality review
  - `npm run pack:smoke` if required by touched CLI/package surface
- Rollback plan:
  - Revert providerIssueHandoff/test changes if focused regression or retained recovery behavior fails.
  - Move unrelated projection/timeout debt to the canonical adjacent owner instead of widening this lane.

## Risks & Mitigations
- Risk: stale persisted blocker-edge metadata is treated as final authority.
  - Mitigation: use it only to permit/trigger live Linear issue refresh; update same-issue metadata from live source truth.
- Risk: still-open released/not_active recovery regresses.
  - Mitigation: run existing nearby retained released/not_active tests and default test suite.
- Risk: CO-459/CO-476 adjacent debt appears in validation.
  - Mitigation: file/reuse follow-up owner with canonical key rather than broadening CO-491.

## Approvals
- Reviewer: provider-worker parent lane.
- Date: 2026-05-02.
