# ACTION_PLAN - Coordinator Symphony Post-Merge Retry-Timer Follow-Up

## Added by Bootstrap 2026-03-23

## Summary
- Goal: close the post-merge `main` regression exposed after `CO-2` merged by stabilizing the retry-timer test seam and delivering the follow-up end to end.
- Scope: docs-first packet, Actions failure audit, optional Linear follow-up issue creation, minimal implementation, validation, PR, feedback handling, merge, and clean-main return.
- Assumptions:
  - the failure is currently best explained by CI-only timer/test brittleness
  - live Linear workflow statuses are already sufficient after `1319`
  - the lane should remain narrow unless local reproduction proves a runtime bug

## Milestones & Sequencing
1. Register `1320` docs-first artifacts and task mirrors.
2. Capture and record the exact `Core Lane` failure evidence.
3. Run docs-review for the new lane.
4. Create a Linear follow-up issue if the current credentials and team/project bindings allow it safely.
5. Implement the smallest correct stabilization, preferring test-only changes.
6. Run focused validation, then the full validation floor.
7. Open PR, handle feedback/checks, wait through the quiet window, merge, and return to clean `main`.

## Dependencies
- GitHub Actions run `23425656167`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerIssueRetryQueue.ts`
- current Linear workspace/team/project bindings

## Validation
- Checks / tests:
  - docs-review
  - focused retry-timer test repetitions
  - full repo validation floor
- Rollback plan:
  - if the patch broadens unexpectedly or exposes a real runtime bug, stop and split the runtime fix into a separate follow-up instead of forcing it into this test-stability lane

## Risks & Mitigations
- Risk: masking a real runtime bug as test-only flake.
  - Mitigation: keep local reproduction attempts and code audit explicit in the packet before patching.
- Risk: widening into unrelated deferred parity work.
  - Mitigation: keep `1320` scoped to the post-merge failure surface only.
- Risk: follow-up Linear issue creation mutates the wrong project/team.
  - Mitigation: read current issue-context first and reuse those exact bindings.

## Approvals
- Reviewer: pending docs-review for `1320`.
- Date: 2026-03-23
