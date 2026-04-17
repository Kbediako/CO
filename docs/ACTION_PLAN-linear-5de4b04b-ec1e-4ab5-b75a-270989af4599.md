# ACTION_PLAN - CO: make linear transition race-safe with expected-state/CAS semantics and expected updated_at

## Added by Docs Child Lane 2026-04-17

## Summary
- Goal: close `CO-215` by making `linear transition` race-safe with expected-state/CAS semantics, expected updated_at, terminal/completed workflow type guarding, explicit `--force`, force reason, and richer audit output.
- Scope: this child lane creates the docs-first packet and registry/checklist mirrors only; the parent lane owns implementation, focused tests, docs-review, validation, Linear/workpad state, PR lifecycle, and final review.
- Assumptions:
  - merged `PR #507` already closed `CO-212`, so this follow-on lane is about stale transition races rather than reclaim policy
  - current `linearCliShell.ts` transition surface forwards only target state
  - current `providerLinearWorkflowFacade.ts` transition helper enforces mutability and target-state resolution but not expected-state/CAS semantics or expected updated_at
  - current `providerLinearWorkflowStates.ts` already exposes terminal/completed workflow type truth
  - current `providerMergeCloseout.ts` already owns `In Review -> Merging` and `Merging -> Done`

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `linear transition`, `expected-state/CAS semantics`, `expected updated_at`, `terminal/completed workflow type`, `Done -> Merging race`, `In Review -> Merging`, `Merging -> Done`, `--force`, `force reason`, `audit output`, `providerLinearWorkflowFacade.ts`, `linearCliShell.ts`, `providerLinearWorkflowStates.ts`, `providerMergeCloseout.ts`, `CO-212`, and `PR #507`
- Not done if:
  - stale transitions still write with target state only
  - stale `Done -> Merging race` remains possible without explicit `--force`
  - force path lacks force reason or durable audit output
  - parent validation does not cover `In Review -> Merging`, `Merging -> Done`, and mismatch/force paths
- Pre-implementation issue-quality review:
  - 2026-04-17: child-lane review confirms this is a narrow transition-contract lane, not a broad workflow-state redesign. The missing source payload prevents verbatim issue-body reuse, so the packet is intentionally anchored on the protected wording from the request plus direct inspection of the current transition, workflow-state, and merge-closeout seams. The micro-task path is ineligible because correctness depends on exact protected names, exact lifecycle surfaces, and exact audit semantics.

## Milestones & Sequencing
1. Child lane drafts the `CO-215` PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and docs-freshness registry entries inside the declared file scope.
2. Parent accepts or adjusts this packet and continues owning the authoritative issue workspace, Linear/workpad state, and implementation planning.
3. Parent inspects `linearCliShell.ts`, `providerLinearWorkflowFacade.ts`, `providerLinearWorkflowStates.ts`, and `providerMergeCloseout.ts` against the current target-only transition behavior and the protected `Done -> Merging race`.
4. Parent defines the final `linear transition` guard surface for expected-state/CAS semantics, expected updated_at, `--force`, force reason, and audit output.
5. Parent threads the new transition contract through `In Review -> Merging` and `Merging -> Done`.
6. Parent adds focused coverage in `ProviderLinearWorkflowFacade.test.ts`, `LinearCliShell.test.ts`, and `ProviderMergeCloseout.test.ts` for normal transitions, stale mismatches, and forced overrides.
7. Parent validates with focused tests plus the normal parent-owned docs-review / implementation-gate flow before PR handoff.

## Dependencies
- `orchestrator/src/cli/linearCliShell.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowStates.ts`
- `orchestrator/src/cli/control/providerMergeCloseout.ts`
- `orchestrator/tests/LinearCliShell.test.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `orchestrator/tests/ProviderMergeCloseout.test.ts`
- merged `PR #507` / `CO-212` as upstream context

## Validation
- Checks / tests:
  - child lane: scoped docs/JSON, protected-term, and diff sanity only
  - parent lane: focused `ProviderLinearWorkflowFacade.test.ts`
  - parent lane: focused `LinearCliShell.test.ts`
  - parent lane: focused `ProviderMergeCloseout.test.ts`
  - parent lane: `node scripts/spec-guard.mjs --dry-run`
  - parent lane: manifest-backed docs-review or implementation gate selected by parent
- Rollback plan:
  - revert the transition-guard change if it regresses ordinary matching transitions or breaks merge-closeout semantics
  - preserve current workflow-state classification and reclaim behavior from `CO-212`
  - never roll back by silently dropping mismatch truth or by normalizing `--force` into the default path

## Risks & Mitigations
- Risk: expected-state/CAS semantics and expected updated_at drift apart between CLI, helper, and merge-closeout callers.
  - Mitigation: define one transition contract in `providerLinearWorkflowFacade.ts` and thread it through callers unchanged.
- Risk: terminal/completed workflow type truth is duplicated instead of reused.
  - Mitigation: keep classification in `providerLinearWorkflowStates.ts`.
- Risk: force path becomes an untracked escape hatch.
  - Mitigation: require force reason and richer audit output.
- Risk: `CO-212` / `PR #507` regress under the new transition guard.
  - Mitigation: keep reclaim behavior out of scope and validate race cases in focused tests only.

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-17
