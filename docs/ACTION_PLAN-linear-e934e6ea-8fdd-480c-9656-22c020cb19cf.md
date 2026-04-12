# ACTION_PLAN - CO workflow: hard-gate all Linear consumers on shared request headroom

## Added by Bootstrap 2026-04-12

## Summary
- Goal: close `CO-156` by making one shared request-headroom reserve authoritative across nonessential Linear consumers and by persisting shared request-burn attribution over time.
- Scope: docs-first packet, audited docs-review child stream, reserve-aware governor changes in `linearBudgetState.ts`, caller-proof coverage through dispatch/helper seams, shared request-burn telemetry persistence, targeted regressions, and normal validation/review gates.
- Assumptions:
  - the landed `CO-62`, `CO-110`, `CO-144`, and `CO-147` work remains the correct substrate
  - the remaining live gap is reserve-blind preflight and missing shared burn history, not missing helper validation or missing webhook-first targeted reconcile
  - existing helper noop/local-validation behavior should be preserved rather than reimplemented

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `shared request headroom`, `raw request count`, `request-burn telemetry`, `dispatch_source_tracked_issues:recovery_sweep`, `dispatch_source_tracked_issues:fresh_discovery`, and `CO-144`
- Not done if:
  - reserve-blind live requests still occur during low headroom or cooldown
  - restart/rehydrate/reconcile can still spend live requests below reserve
  - shared request-burn attribution over time is still missing
- Pre-implementation issue-quality review:
  - keep the change centered on the shared governor and shared telemetry rather than widening into architecture redesign

## Milestones & Sequencing
1. Draft/register the CO-156 docs-first packet, mirror the checklist, update the single workpad source, and run the audited `linear child-stream --pipeline docs-review` lane.
2. Implement reserve-aware shared preflight and shared request-burn telemetry in `linearBudgetState.ts`, then verify helper/dispatch callers inherit the new gate without per-caller drift.
3. Add focused regressions for reserve-aware fail-fast and shared telemetry persistence, then rerun the required validation floor.
4. Run standalone review first, address findings, run the explicit elegance pass, and refresh the workpad before any review handoff.

## Dependencies
- `orchestrator/src/cli/control/linearBudgetState.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/tests/LinearBudgetState.test.ts`
- `orchestrator/tests/LinearDispatchSource.test.ts`

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
  - revert the reserve-aware gate and shared telemetry persistence together if they cause false positives or misleading attribution
  - preserve the previously landed helper validation/no-op contracts and polling slowdown behavior

## Risks & Mitigations
- Risk: the lane widens into a second governance layer instead of strengthening the existing one.
  - Mitigation: keep the core logic in `linearBudgetState.ts` and reuse existing callers.
- Risk: new reserve checks accidentally block safe cached/local fallback paths.
  - Mitigation: preserve helper-local fallback behavior and add focused tests around cached/local outcomes.
- Risk: telemetry becomes too noisy or unbounded to inspect.
  - Mitigation: keep the history bounded and machine-checkable.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-12
