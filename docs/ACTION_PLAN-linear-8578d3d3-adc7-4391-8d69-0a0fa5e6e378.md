# ACTION_PLAN - CO: prevent operator-autopilot Backlog to Ready re-promotion churn after a manual Ready to Backlog demotion

## Added by Docs Child Lane 2026-04-17

## Summary
- Goal: prevent `operator-autopilot` from immediately re-promoting the same backlog snapshot after a manual `Ready -> Backlog` demotion.
- Scope: this child lane creates the docs-first packet and registry/checklist mirrors only; the parent lane owns implementation, focused tests, docs-review, validation, Linear/workpad state, PR lifecycle, and final review.
- Assumptions:
  - the current backlog-promotion path already uses `expectedStateName`, `expectedStateType`, and `expectedUpdatedAt`
  - the current generic transition guard from `providerLinearWorkflowFacade.ts` is sufficient and should be preserved rather than redesigned here
  - the narrow gap is bounded to cross-cycle manual-demotion hold detection plus result/observability projection

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `operator-autopilot`, `Backlog to Ready`, `manual Ready to Backlog demotion`, `re-promotion churn`, `providerOperatorAutopilot.ts`, `previous_result`, `expectedStateName`, `expectedStateType`, `expectedUpdatedAt`, `transition_guard`, `issue updated_at`, `hold reason`, and `force path`
- Not done if:
  - the next autopilot cycle still re-promotes the same issue after a manual demotion
  - normal safe backlog-head promotion regresses when no manual-demotion signal exists
  - expected-state metadata is lost from the operator-facing autopilot result path even though backlog promotion still passes it into the shared transition helper
  - observability still cannot report `issue updated_at`, hold reason, and force-path usage
  - the parent fix widens into scheduler redesign, generic `CO-215` scope, or refresh-stall repair
- Pre-implementation issue-quality review:
  - 2026-04-17: child-lane review confirms the remaining work is a narrow operator-autopilot hold/projection seam. The provided `.runs` payload is absent in this checkout, so the packet is anchored on the protected request wording plus direct inspection of current backlog-promotion, transition-guard, persistence, and observability surfaces. The micro-task path is ineligible because the correctness boundary depends on exact wording and exact result/observability fields.

## Milestones & Sequencing
1. Child lane drafts the `CO-216` PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, and `docs/TASKS.md` inside the declared file scope.
2. Parent imports this packet and reconciles it against the authoritative Linear issue/workpad state.
3. Parent inspects `providerOperatorAutopilot.ts` for the current backlog-promotion path and confirms the exact manual-demotion signal it can derive from live tracked issue truth plus prior autopilot result.
4. Parent adds the bounded hold logic so the exact demoted `Backlog` snapshot is held rather than re-promoted.
5. Parent keeps backlog-promotion expected-state metadata at the shared transition-helper seam and projects the relevant `issue updated_at`, hold reason, and force-path usage through stored autopilot result and observability.
6. Parent adds focused regressions for promote -> manual demote -> hold and for the unchanged normal safe promotion path.
7. Parent runs focused validation plus the normal parent-owned docs-review / implementation-gate flow before PR handoff.

## Dependencies
- `orchestrator/src/cli/control/providerOperatorAutopilot.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/tests/ProviderOperatorAutopilot.test.ts`
- `orchestrator/tests/ProviderWorkflowConfigStore.test.ts`
- `orchestrator/tests/ObservabilityReadModel.test.ts`
- existing `ProviderLinearWorkflowFacade.test.ts` transition-guard coverage

## Validation
- Checks / tests:
  - child lane: scoped docs/JSON, protected-term, and diff sanity only
  - parent lane: focused `ProviderOperatorAutopilot.test.ts`
  - parent lane: focused `ProviderWorkflowConfigStore.test.ts`
  - parent lane: focused `ObservabilityReadModel.test.ts`
  - parent lane: preserve-contract `ProviderLinearWorkflowFacade.test.ts` when metadata projection changes
  - parent lane: manifest-backed docs-review or implementation gate selected by parent
- Rollback plan:
  - revert the autopilot hold/projection change if it regresses normal safe backlog-head promotion
  - preserve the current transition guard contract from `providerLinearWorkflowFacade.ts`
  - never roll back by silently dropping expected-state inputs from the transition-helper seam or by widening the issue into queue redesign

## Risks & Mitigations
- Risk: the hold is too broad and suppresses future legitimate backlog promotion.
  - Mitigation: key the hold to the exact manual-demotion snapshot and reevaluate later distinct snapshots normally.
- Risk: the fix drops or duplicates the existing transition metadata contract.
  - Mitigation: preserve the existing `transition_guard` truth and project it rather than recreating it.
- Risk: observability reports only summaries and hides the actual hold reason or `updated_at` context.
  - Mitigation: keep explicit structured fields in stored result and read-model payloads.
- Risk: parent expands into generic scheduler or refresh behavior.
  - Mitigation: keep the packet explicit that those lanes are out of scope.

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-17
