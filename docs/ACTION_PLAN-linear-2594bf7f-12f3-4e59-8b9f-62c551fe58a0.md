# ACTION_PLAN - CO: restore unrelated full-suite SelectedRunProjection reservation-ledger placeholder timeout blocking CO-226 / CO-219

## Summary
- Goal: give the parent lane a bounded implementation plan for the unrelated full-suite-only timeout around `orchestrator/tests/SelectedRunProjection.test.ts` case `refreshes projection proofs when child-lane reservation ledger placeholders exist`, while preserving the contrast that the isolated repro already passes and `Doctor.test.ts` is no longer the blocker in the same rerun.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned implementation, parent-owned focused validation, and explicit adjacency to `CO-226` / `CO-219`.
- Assumptions:
  - the provider-worker prompt source remains the authoritative issue anchor
  - the parent prompt's wording is authoritative for the issue checksum
  - the smallest correct fix sits near SelectedRunProjection proof refresh and child-lane placeholder resolution, not in broad unrelated runtime redesign

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `npm run test`
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `refreshes projection proofs when child-lane reservation ledger placeholders exist`
  - `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"`
  - `orchestrator/tests/Doctor.test.ts`
  - `CO-226`
  - `CO-219`
  - `provider-linear-worker-proof.json`
  - `provider-linear-worker-child-lanes.json`
  - `Child lane reserved before child run startup.`
- Not done if:
  - full `npm run test` still times out or stalls around the SelectedRunProjection placeholder case without explicit residual ownership
  - the parent closes the issue based only on the isolated repro staying green
  - `Doctor.test.ts` is reintroduced as the blocker without fresh proof
  - the lane widens into `CO-226` / `CO-219` implementation or broad runtime redesign
- Pre-implementation issue-quality review:
  - 2026-04-18: accepted framing is a suite-context mismatch, not an isolated failing test
  - 2026-04-18: accepted current truth is that `Doctor.test.ts` is no longer the blocker in the same rerun
  - 2026-04-18: accepted adjacency is explicit `CO-226` / `CO-219` linkage rather than silent background context

## Milestones & Sequencing
1. Create the docs-first packet and bounded registry mirrors for `CO-233` within the declared docs scope.
2. Parent reproduces the branch-baseline mismatch exactly:
   - `npm run test`
   - `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"`
   - confirm the same rerun no longer treats `orchestrator/tests/Doctor.test.ts` as the live blocker
3. Parent identifies the smallest shared seam between SelectedRunProjection proof refresh and child-lane reservation ledger placeholder state.
4. Parent lands the smallest truthful hardening in `selectedRunProjection.ts` and adjacent proof-refresh helpers only if required.
5. Parent reruns the focused SelectedRunProjection repro and any adjacent proof-refresh coverage.
6. Parent reruns full `npm run test` and records whether `CO-233` is fixed or whether a narrower residual blocker needs explicit ownership.

## Dependencies
- Shared source anchor: `ctx:sha256:6c489971dd6f03545c47f5063f802b920c1c52fcee78a5d03e16d6b81d7d17a5#chunk:c000001`
- Origin manifest: `.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0-docs-packet/cli/2026-04-18T01-33-37-759Z-74148585/manifest.json`
- Likely parent implementation seams:
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts` if shared proof projection consumers need alignment
- Likely parent focused tests:
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `orchestrator/tests/ProviderLinearChildLaneShell.test.ts` if proof-refresh helpers are touched
  - `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts` if serialized proof readers are touched

## Validation
- Child lane only:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `rg -n "npm run test|orchestrator/tests/SelectedRunProjection.test.ts|refreshes projection proofs when child-lane reservation ledger placeholders exist|npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t \\\"refreshes projection proofs when child-lane reservation ledger placeholders exist\\\"|orchestrator/tests/Doctor.test.ts|CO-226|CO-219|provider-linear-worker-proof.json|provider-linear-worker-child-lanes.json|Child lane reserved before child run startup." docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`
  - `git diff --check -- docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent implementation lane:
  - `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"`
  - `npm run test`
  - focused `ProviderLinearChildLaneShell.test.ts` / `ProviderIssueHandoffRefreshSerialization.test.ts` coverage if shared proof refresh changes
  - parent docs-review before implementation
- Rollback plan:
  - revert the narrow proof-refresh / placeholder hardening if it hides the suite-context mismatch without actually fixing it

## Risks & Mitigations
- Risk: the parent treats the isolated repro pass as sufficient and skips full-suite validation.
  - Mitigation: keep `npm run test` explicit as the authoritative blocker surface in every packet artifact.
- Risk: the parent reopens `Doctor.test.ts` instead of the actual current blocker.
  - Mitigation: keep the "Doctor is no longer the live blocker" contrast explicit in every packet artifact.
- Risk: the parent broadens into `CO-226` / `CO-219` work or generic timeout tuning.
  - Mitigation: keep the proof-refresh / placeholder seam explicit and the adjacent issue linkage bounded.

## Approvals
- Docs packet child lane: `.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0-docs-packet/cli/2026-04-18T01-33-37-759Z-74148585/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation/review/PR lifecycle: pending parent lane
