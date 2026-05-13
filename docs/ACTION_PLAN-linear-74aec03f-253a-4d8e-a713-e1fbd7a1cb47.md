# ACTION_PLAN - CO: stop stale review and dead-claim reconciliation from burning Linear requests

## Added by Bootstrap 2026-04-12

## Summary
- Goal: close `CO-159` by making stale active claims and completed review-handoff claims fail closed from local evidence before repeated live Linear reads, and by bounding restart or recovery live refresh behavior when no runnable work exists.
- Scope: docs-first packet, audited docs-review child stream, stale-claim and review-wait reconciliation changes in provider/control-host seams, focused regression tests, request-burn attribution updates, and normal validation/review gates.
- Assumptions:
  - `CO-144` webhook-first targeted reconcile and `CO-156` shared request-headroom governor are already the correct baseline
  - the current defect is repeated live refresh behavior around stale claim reconciliation, not missing provider-worker review handoff semantics overall
  - paused workspaces and child-lane artifacts must remain resumable

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `webhook-first targeted reconcile`, `shared request-headroom governor`, `dispatch_source_issue_by_id`, `dispatch_source_tracked_issues:fresh_discovery`, `CO-139`, and `CO-96`
- Not done if:
  - dead active claims still cause repeated live issue-by-id reads
  - completed review-handoff claims still trigger retry or issue-context loops while PR checks are pending
  - startup or recovery keeps live discovery active when there is no runnable work or reserve is low
- Pre-implementation issue-quality review:
  - keep the lane bounded to stale-claim and review-wait reconciliation; do not widen into provider scheduling redesign or manual-ops workarounds

## Milestones & Sequencing
1. Draft and register the `CO-159` docs-first packet, mirror the checklist, update the single workpad source, and run the audited `linear child-stream --pipeline docs-review` lane.
2. Implement the narrow reconciliation fix in the provider/control-host seams so stale active claims and completed review-handoff claims stop causing repeated live reads.
3. Add focused regressions for dead active claim handling, review-wait suppression, and bounded startup or recovery behavior, then rerun the required validation floor.
4. Run standalone review first, address findings, run the explicit elegance pass, and refresh the workpad before any review handoff.

## Dependencies
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/LinearDispatchSource.test.ts`
- `orchestrator/tests/ControlServerPublicLifecycle.test.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review --format json`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the stale-claim and review-wait suppression changes together if they hide useful runnable work or incorrectly suppress needed live refresh
  - preserve cached truth, workpad, review handoff, and paused workspace salvage contracts

## Risks & Mitigations
- Risk: the change accidentally suppresses live refresh for genuinely runnable work.
  - Mitigation: keep the suppression keyed to authoritative stale-proof or review-wait evidence and add focused regressions.
- Risk: recovery logic keeps a hidden repeated loop under a different source label.
  - Mitigation: update request-burn attribution so stale reconciliation and review wait remain inspectable.
- Risk: the lane widens into a broad control-host redesign.
  - Mitigation: keep the implementation centered on the existing provider/control-host reconciliation seams only.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-12
