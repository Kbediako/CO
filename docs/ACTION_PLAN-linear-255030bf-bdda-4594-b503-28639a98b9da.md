# ACTION_PLAN - CO: shift Linear intake to webhook-first targeted reconcile with slow full recovery sweeps

## Added by Bootstrap 2026-04-10

## Summary
- Goal: reduce ordinary Linear request burn by moving the common intake path to webhook-by-id plus targeted reconcile, while keeping startup and slower missed-event recovery truthful.
- Scope: docs-first packet, audited docs-review, lifecycle and discovery split, lean discovery queries, slower full sweep policy, focused regressions, request-burn evidence capture, and the required validation or review gates.
- Assumptions:
  - webhook deliveries already cover most new or changed issue arrivals
  - direct by-id reconcile is sufficient for existing claims on ordinary ticks
  - older unchanged ready work still needs a slower full sweep because webhook-first alone will not discover it

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `webhook-first targeted reconcile`, `slow full recovery sweeps`, `fresh-dispatch polling`, `missed-webhook recovery`, `retry/refetch correctness`, `relaunch-after-success`, and `operator-facing budget truth`; keep the implementation focused on `linearWebhookController.ts`, `controlServerPublicLifecycle.ts`, `providerIssueHandoff.ts`, `linearDispatchSource.ts`, and `providerPollingHealth.ts`.
- Not done if:
  - ordinary ticks still full-scan the active set by default
  - bounded fresh discovery does not stop after current free-slot demand is satisfied
  - startup or slow-sweep recovery can no longer recover older unchanged ready work
  - retry, release, reattach, or relaunch semantics regress
  - the lane has no before or after request-burn evidence
- Pre-implementation issue-quality review: approved. The issue is broader than a query trim, but it stays bounded to intake and recovery scheduling rather than widening into provider mutation or review-helper redesign.

## Milestones & Sequencing
1. Draft and register the docs-first packet, checklist mirrors, task-index row, and `docs/TASKS.md` snapshot
2. Run an audited `docs-review` child stream and fold any packet corrections or truthful fallback notes back into the packet
3. Split ordinary lifecycle behavior into targeted reconcile, bounded fresh discovery, and slower full recovery sweep
4. Trim fresh-discovery payloads and add free-slot-aware early-stop behavior in the Linear dispatch source
5. Add focused regressions, capture request-burn evidence, then run the full validation or review floor before any handoff

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
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-144-docs-review --format json`
  - focused Vitest coverage for `LinearDispatchSource`, `ProviderIssueHandoff`, and `ControlServerPublicLifecycle`
  - `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npm run build`
  - `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npm run test`
  - `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da FORCE_CODEX_REVIEW=1 npm run review`
- Rollback plan:
  - revert to the existing ordinary poll-backed intake shape if the split causes missed launches, stale releases, or misleading polling truth
  - move any larger observability or quota-reporting expansion into a same-project follow-up instead of widening this lane past the intake split

## Risks & Mitigations
- Risk: direct by-id reconcile plus bounded discovery misses unchanged older ready work.
  - Mitigation: keep startup full recovery and a slower full sweep explicit and test-backed.
- Risk: discovery stop conditions underfill available capacity.
  - Mitigation: compute target count from the actual free-slot budget and test with mixed eligible and ineligible issue sets.
- Risk: lean discovery omits data needed for eligibility or ownership checks.
  - Mitigation: keep only the minimum required fields in the discovery query and rely on by-id hydrate before launch or reconcile when richer truth is needed.
- Risk: operator-facing polling truth gets harder to interpret after the mode split.
  - Mitigation: preserve reason and next-refresh reporting in `providerPollingHealth.ts` and add focused checks for the new mode semantics.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-10
