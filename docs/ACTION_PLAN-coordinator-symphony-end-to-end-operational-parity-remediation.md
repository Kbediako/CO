# ACTION_PLAN - Coordinator Symphony End-to-End Operational Parity Remediation

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: close the remaining gap between current CO behavior and current Symphony end-to-end operational lifecycle behavior.
- Scope: current-Symphony audit refresh, live Linear workflow-state sufficiency, provider worker lifecycle alignment at the review handoff boundary plus rework and merge re-entry, PR feedback handling, read-model truthfulness, validation, live proof, and delivery discipline.
- Assumptions:
  - `1318` remains the landed helper/workpad baseline rather than being reverted
  - current live CO team uses `In Review` as the review-handoff alias
  - `Merging` and `Rework` were the only clearly missing live workflow states for the CO team and have already been added
  - blocker-aware `Todo` suppression and optional read-only control surfaces are already landed, so 1319 should not reopen them unless a concrete regression appears
  - current Symphony parity still requires explicit named active-state routing from `WORKFLOW.md`, not a generic Linear `started` fallback
  - current CO team keeps `Ready` instead of `Todo`, so parity now depends on an explicit queue alias rather than another live state addition

## Milestones & Sequencing
1. Register and review-back `1319` as the authoritative parity remediation lane.
2. Complete the current audit and lock the implementation scope:
   - classify required `SPEC.md` items vs optional-but-operationalized items vs Elixir-only operational behaviors
   - classify each broadened Elixir behavior as already-landed in CO, clearly missing, or not relevant to CO parity
   - record current CO gaps and the smallest coherent implementation slices
3. Resolve live Linear workflow-state sufficiency:
   - confirm `In Review` is sufficient as the review alias and do not add `Human Review`
   - add `Merging` and `Rework` to the CO team workflow
   - record that no further live state additions are required once `Ready` is treated as the `Todo` equivalent
   - capture exact verification artifacts
4. Land runtime/provider lifecycle parity:
   - remove the over-broad `state_type: started` execution fallback and honor only the named active workflow states configured for current Symphony parity
   - treat live-team `Ready` as the queue alias for Symphony `Todo` so unattended queue pickup still works on the CO team
   - stop treating review as generic inactivity and classify it as an explicit handoff boundary
   - add feedback re-entry / rework / merge / done handling around that boundary
   - add exact `Rework` reset semantics: close the prior PR, remove the old workpad, and restart from a fresh branch
   - keep provider-intake lifecycle reasons and proof surfaces truthful
5. Land GitHub/PR lifecycle parity:
   - feedback sweep loop
   - unresolved-thread / checks / conflict handling
   - merge loop equivalent to Symphony `land`
   - final `Done` transition after merge success
6. Land observability/read-model cleanup:
   - remove stale dispatch traceability leakage
   - ensure intake/advisory/read surfaces converge after terminal completion
7. Keep assignee-stop/reassignment handling in 1319 core and explicitly defer the broader non-review Elixir operational gaps to follow-on slices:
   - workflow cleanup and PR auto-close behavior
   - follow-up issue creation
   - workflow-file hot reload / last-known-good fallback
8. Run the full validation floor, docs checks, review/elegance passes, one live Linear retest, PR, feedback loop, merge, and clean-main closeout

## Dependencies
- Current Symphony authorities:
  - `symphony@a164593aacb3db4d6808adc5a87173d906726406: SPEC.md`
  - `symphony@a164593aacb3db4d6808adc5a87173d906726406: elixir/README.md`
  - `symphony@a164593aacb3db4d6808adc5a87173d906726406: elixir/WORKFLOW.md`
  - `symphony@a164593aacb3db4d6808adc5a87173d906726406: elixir/lib/symphony_elixir/tracker.ex`
  - `symphony@a164593aacb3db4d6808adc5a87173d906726406: elixir/lib/symphony_elixir/linear/adapter.ex`
  - `symphony@a164593aacb3db4d6808adc5a87173d906726406: elixir/lib/symphony_elixir/orchestrator.ex`
  - `symphony@a164593aacb3db4d6808adc5a87173d906726406: elixir/test/symphony_elixir/live_e2e_test.exs`
- Current CO seams:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowStates.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/linearCliShell.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/observabilityApiController.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` when downstream-facing control/CLI/read surfaces change
  - `docs-review` before implementation
- Rollback plan:
  - if review/merge lifecycle expansion proves too broad, revert the new lifecycle slice while preserving the already-landed helper/workpad substrate
  - if live workflow-state mutation is unsafe or unexpected, stop after read-only verification and keep it as an explicit operator/ops follow-up instead of forcing a blind mutation

## Risks & Mitigations
- Risk: mixing two different parity targets and losing truthfulness.
  - Mitigation: keep `SPEC`, optional extension, and Elixir operational behaviors separated in docs and code comments.
- Risk: mutating live Linear workflow states incorrectly.
  - Mitigation: inspect current schema and live state map first, apply the minimum exact changes only if safe, and capture before/after evidence.
- Risk: over-claiming parity while the live CO team still uses `Ready` instead of `Todo`.
  - Mitigation: either add a truthful queue alias in code and docs or add the missing live state with exact evidence; do not leave it implicit.
- Risk: overloading the provider worker with both coding and merge discipline without explicit lifecycle boundaries.
  - Mitigation: implement review handoff, rework, merge, and done as named lifecycle stages with focused tests and proof markers.
- Risk: closing the runtime gap while leaving stale observability/reporting bugs behind.
  - Mitigation: keep read-model cleanup as an explicit milestone with live dispatch verification.

## Approvals
- Reviewer: `1319` docs-review approved.
- Date: 2026-03-23
