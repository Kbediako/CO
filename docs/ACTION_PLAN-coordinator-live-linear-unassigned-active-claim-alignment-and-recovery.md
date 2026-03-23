# ACTION_PLAN - Coordinator Live Linear Unassigned Active-Claim Alignment and Recovery

## Added by Bootstrap 2026-03-23

## Summary
- Goal: unstick live `CO-3` by aligning existing-claim ownership with fresh dispatch for active unassigned issues and by adding the smallest released-claim refresh recovery needed to resume work without another Linear flip.
- Scope: docs-first packet, docs-review, minimal provider claim/recovery patch, focused regressions, full validation, live retest on the local control host, PR/feedback/merge, and clean-main return.
- Assumptions:
  - `CO-3` remains `Merging` and unassigned in live Linear
  - the control host can be rebuilt/restarted locally for proof after validation
  - no new workflow status creation is required

## Milestones & Sequencing
1. Register `1321` docs-first artifacts and task mirrors with the live `CO-3` evidence.
2. Run docs-review for the registered lane.
3. Implement the smallest runtime fix in `providerIssueHandoff.ts` and the focused `ProviderIssueHandoff.test.ts` regressions.
4. Run focused tests, then the full validation floor, then a bounded review/elegance pass.
5. Restart the local control host on the patched tree and verify `CO-3` reclaims without another operator flip.
6. Monitor the resumed `CO-3` flow through PR `#289`, handle feedback/checks, merge the lane PR, and return the repo to clean `main`.

## Dependencies
- live local control host in tmux session `co-control-host`
- live `CO-3` issue context and `/api/v1/dispatch`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- PR `#289`

## Validation
- Checks / tests:
  - docs-review
  - focused `ProviderIssueHandoff` regressions for active unassigned claims and equal-timestamp released recovery
  - full repo validation floor
  - live control-host retest on `CO-3`
- Rollback plan:
  - if the patch broadens unexpectedly or changes explicit reassignment-away behavior, stop and split the broader behavior change instead of forcing it into `1321`

## Risks & Mitigations
- Risk: a shared null-assignee fix changes existing review-handoff behavior as well as active-state behavior.
  - Mitigation: keep tests explicit for foreign-assignee release behavior and document any review-state change truthfully in the packet.
- Risk: the ownership fix alone leaves the already-released live claim stuck.
  - Mitigation: add the smallest refresh-only released-claim recovery seam and prove it live on `CO-3`.
- Risk: live proof is blocked by stale local control-host code.
  - Mitigation: rebuild and restart the existing host only after validation is green.

## Approvals
- Reviewer: pending docs-review for `1321`.
- Date: 2026-03-23
