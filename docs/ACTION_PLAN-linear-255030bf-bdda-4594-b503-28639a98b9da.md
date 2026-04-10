# ACTION_PLAN - CO: shift Linear intake to webhook-first targeted reconcile with slow full recovery sweeps

## Summary
- Goal: reduce ordinary Linear request burn by moving the common intake path to webhook-by-id plus targeted reconcile, while keeping startup and slower missed-event recovery truthful.
- Scope: docs-first packet, audited docs-review, lifecycle and discovery split, lean discovery queries, slower full sweep policy, focused regressions, request-burn evidence capture, and the required validation or review gates.
- Assumptions:
  - webhook deliveries already cover most new or changed issue arrivals
  - direct by-id reconcile is sufficient for existing claims on ordinary ticks
  - older unchanged ready work still needs a slower full sweep because webhook-first alone will not discover it

## Issue Readiness Gate
- Preserve the protected terms and surfaces from the PRD.
- Not done if ordinary ticks still full-scan the active set, bounded fresh discovery does not stop after current demand is satisfied, recovery semantics regress, or the lane has no request-burn evidence.
- Pre-implementation issue-quality review: approved. The issue is broader than a query trim, but it stays bounded to intake and recovery scheduling.

## Milestones
1. Draft and register the docs-first packet, checklist mirrors, task-index row, and `docs/TASKS.md` snapshot.
2. Run an audited `docs-review` child stream and fold any packet corrections or truthful fallback notes back into the packet.
3. Split ordinary lifecycle behavior into targeted reconcile, bounded fresh discovery, and slower full recovery sweep.
4. Trim fresh-discovery payloads and add free-slot-aware early-stop behavior in the Linear dispatch source.
5. Add focused regressions, capture request-burn evidence, then run the full validation or review floor before any handoff.

## Dependencies
- `orchestrator/src/cli/control/linearWebhookController.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- `orchestrator/src/cli/control/providerPollingHealth.ts`
- `orchestrator/tests/LinearDispatchSource.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ControlServerPublicLifecycle.test.ts`

## Validation
- `linear child-stream --pipeline docs-review`
- focused Vitest coverage for `LinearDispatchSource`, `ProviderIssueHandoff`, and `ControlServerPublicLifecycle`
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `FORCE_CODEX_REVIEW=1 npm run review`

## Rollback / Risk
- Revert to the existing ordinary poll-backed intake shape if the split causes missed launches, stale releases, or misleading polling truth.
- Move any larger observability or quota-reporting expansion into a same-project follow-up instead of widening this lane past the intake split.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-10
