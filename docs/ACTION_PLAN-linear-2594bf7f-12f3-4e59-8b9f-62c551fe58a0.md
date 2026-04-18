# ACTION_PLAN - CO: restore unrelated full-suite SelectedRunProjection reservation-ledger placeholder timeout blocking CO-226 / CO-219

## Summary
- Goal: give the parent lane a bounded implementation plan for the unrelated full-suite-only timeout around `orchestrator/tests/SelectedRunProjection.test.ts` case `refreshes projection proofs when child-lane reservation ledger placeholders exist`, while preserving the contrast that the isolated repro already passes and `Doctor.test.ts` is no longer the blocker in the same rerun.
- Scope: existing docs-first packet, issue-local checklist mirrors, the current branch's bounded Vitest worker-cap implementation in `vitest.config.core.ts` plus matching config-test coverage in `tests/vitest-progress-config.spec.ts`, parent-owned focused validation, and explicit adjacency to `CO-226` / `CO-219`.
- Assumptions:
  - the provider-worker prompt source remains the authoritative issue anchor
  - the parent prompt's wording is authoritative for the issue checksum
  - the smallest correct fix is the unattended broad-lane worker-saturation seam in Vitest config unless fresh evidence proves a deeper SelectedRunProjection/proof-refresh defect still remains

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
  - full `npm run test` regresses back into a timeout or stall around the SelectedRunProjection placeholder case before handoff without explicit residual ownership
  - the parent closes the issue based only on the isolated repro staying green
  - `Doctor.test.ts` is reintroduced as the blocker without fresh proof
  - the lane widens into `CO-226` / `CO-219` implementation or broad runtime redesign
- Pre-implementation issue-quality review:
  - 2026-04-18: accepted framing is a suite-context mismatch, not an isolated failing test
  - 2026-04-18: accepted current truth is that `Doctor.test.ts` is no longer the blocker in the same rerun
  - 2026-04-18: accepted adjacency is explicit `CO-226` / `CO-219` linkage rather than silent background context

## Milestones & Sequencing
1. Audit the existing docs-first packet for `CO-233` and refresh only drifted issue-doc references within the declared six-file scope.
2. Parent reproduces the branch-baseline mismatch exactly:
   - `npm run test`
   - `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"`
   - confirm the same rerun no longer treats `orchestrator/tests/Doctor.test.ts` as the live blocker
3. Parent confirms the suite-context delta is explained by unattended broad-lane Vitest worker saturation rather than the isolated SelectedRunProjection assertions.
4. Parent lands the smallest truthful fix in `vitest.config.core.ts`, capping workers for `CI`, `CODEX_VITEST_PROGRESS`, `CODEX_NON_INTERACTIVE`, `CODEX_NO_INTERACTIVE`, and `CODEX_NONINTERACTIVE` while leaving interactive local runs uncapped.
5. Parent updates `tests/vitest-progress-config.spec.ts` so the non-interactive aliases are covered explicitly and the uncapped interactive-local expectation remains protected.
6. Parent reruns the focused SelectedRunProjection repro, full `npm run test`, and the remaining review/pack handoff gates before moving to review.

## Dependencies
- Shared source anchor: `ctx:sha256:3f6604004897f02bc794db8336db014b25eac836f27afb671f1ef946761d47ee#chunk:c000001`
- Audit manifest: `.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0-docs-packet-current-main-audit/cli/2026-04-18T13-48-58-782Z-e41ffc06/manifest.json`
- Source payload note: the audit prompt carries `.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0-docs-packet-current-main-audit/cli/2026-04-18T13-48-58-782Z-e41ffc06/memory/source-0/source.txt`, but that payload is not present in this child checkout.
- Likely parent implementation seams:
  - `vitest.config.core.ts`
  - `tests/vitest-progress-config.spec.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts` only if the suite-only mismatch survives the worker-cap stabilization
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts` / `providerLinearChildLaneShell.ts` only if a deeper proof-refresh defect still reproduces
- Likely parent focused tests:
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `orchestrator/tests/ProviderLinearChildLaneShell.test.ts` if proof-refresh helpers are touched
  - `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts` if serialized proof readers are touched

## Validation
- Child lane only:
  - `rg -n "npm run test|orchestrator/tests/SelectedRunProjection.test.ts|refreshes projection proofs when child-lane reservation ledger placeholders exist|npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t \\\"refreshes projection proofs when child-lane reservation ledger placeholders exist\\\"|orchestrator/tests/Doctor.test.ts|CO-226|CO-219|provider-linear-worker-proof.json|provider-linear-worker-child-lanes.json|Child lane reserved before child run startup." docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`
  - `git diff --check -- docs/PRD-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/TECH_SPEC-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md docs/ACTION_PLAN-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/specs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md tasks/tasks-linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md .agent/task/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0.md`
- Parent implementation lane:
  - `npx vitest run orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"`
  - `npm run test`
  - focused `ProviderLinearChildLaneShell.test.ts` / `ProviderIssueHandoffRefreshSerialization.test.ts` coverage only if a follow-on proof-refresh fix becomes necessary
  - parent docs-review before implementation
- Rollback plan:
  - revert the Vitest worker-cap change in `vitest.config.core.ts` if it fails to resolve the suite-context mismatch or introduces regressions
  - if a follow-on proof-refresh hardening change is introduced later, revert that separately so rollback attribution stays explicit

## Risks & Mitigations
- Risk: the parent treats the isolated repro pass as sufficient and skips full-suite validation.
  - Mitigation: keep `npm run test` explicit as the authoritative blocker surface in every packet artifact.
- Risk: the parent reopens `Doctor.test.ts` instead of the actual current blocker.
  - Mitigation: keep the "Doctor is no longer the live blocker" contrast explicit in every packet artifact.
- Risk: the parent broadens into `CO-226` / `CO-219` work or generic timeout tuning.
  - Mitigation: keep the proof-refresh / placeholder seam explicit and the adjacent issue linkage bounded.

## Approvals
- Docs packet audit lane: `.runs/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0-docs-packet-current-main-audit/cli/2026-04-18T13-48-58-782Z-e41ffc06/manifest.json`
- Parent standalone review / scoped validation: manual fallback plus explicit elegance pass completed. Evidence: `out/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0/manual/20260418T143124Z-standalone-review-fallback.md`, `out/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0/manual/20260418T143124Z-elegance-review.md`.
- Parent implementation/review/PR lifecycle: validation is green through `pack:smoke`; PR attach, `ready-review`, and Linear review-state handoff remain the next parent-owned steps. Evidence: `/tmp/co233-npm-run-test.log`, `out/linear-2594bf7f-12f3-4e59-8b9f-62c551fe58a0/manual/20260418T143528Z-pack-smoke.log`.
