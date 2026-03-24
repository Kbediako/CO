# ACTION_PLAN - Coordinator Live Linear Snapshot-Only Retry Assignee-Identity Fallback

## Added by Bootstrap 2026-03-24

## Summary
- Goal: stop snapshot-only queued retries from releasing self-assigned issues just because fallback reconstruction loses viewer identity, while keeping the fallback conservative if the auth context changes.
- Scope: docs-first packet, docs-review, minimal provider-intake/runtime patch, focused regressions, full validation, and review handoff.
- Assumptions:
  - the current live-resolver ownership path is already correct
  - the fix can stay additive in persisted claim state
  - no workflow-state or provider scheduling changes are required

## Milestones & Sequencing
1. Register `1322` docs-first artifacts and task mirrors with the Symphony/CO ownership-path audit captured.
2. Run docs-review for the registered lane.
3. Implement the smallest claim/viewer-identity patch in `providerIntakeState.ts` and `providerIssueHandoff.ts`, including an auth-fingerprint guard so persisted viewer identity is only replayed under the same Linear token context.
4. Add focused `ProviderIssueHandoff` regressions for same-worker continuation, mismatched-auth conservative release, foreign-assignee release, and backward compatibility.
5. Run focused tests, then the full validation floor, then a bounded review/elegance pass.
6. Update the Linear workpad with implementation + validation truth and hand off to review if the bar is met.

## Dependencies
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/README.md`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/linearGraphqlClient.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Validation
- Checks / tests:
  - docs-review
  - focused `ProviderIssueHandoff` regressions for snapshot-only ownership fallback
  - full repo validation floor
- Rollback plan:
  - if the patch requires weakening the ownership predicate itself instead of supplying truthful fallback metadata, stop and split that broader behavior change into a separate lane

## Risks & Mitigations
- Risk: persisting viewer identity in claims affects unrelated read-model surfaces.
  - Mitigation: keep the field additive and only touch minimal summary/normalization paths required for truthful persistence.
- Risk: persisted viewer identity could become stale if the current Linear auth token changes.
  - Mitigation: store a token fingerprint with the persisted viewer identity and only trust the viewer snapshot when the fingerprint still matches the current auth context.
- Risk: fallback behavior for older claims regresses because the new field is absent.
  - Mitigation: add explicit backward-compatibility coverage where `issue_viewer_id` is still `null`.
- Risk: the fix is attempted by inferring `viewer_id` from `assignee_id`, which would weaken the reassignment guard.
  - Mitigation: persist viewer identity separately and keep eligibility logic unchanged.

## Approvals
- Reviewer: pending docs-review for `1322`.
- Date: 2026-03-24
