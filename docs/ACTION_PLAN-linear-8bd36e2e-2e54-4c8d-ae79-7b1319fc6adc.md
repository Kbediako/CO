# ACTION_PLAN - CO-461 provider docs-review child-stream task identity guard compatibility

## Summary
- Goal: keep provider-launched `docs-review` child streams guard-compatible by aligning child task identity with sanctioned provider parent proof or a registered parent task prefix.
- Scope: docs-first packet in this child lane; parent-owned implementation in provider child-stream launch, delegation guard/provider-run contract, focused regressions, validation, Linear state, workpad, PR lifecycle, and review handoff.
- Assumptions: parent can keep the fix narrow to provider docs-review child identity unless source inspection proves the parent/child contract is split across a broader provider-worker launch seam.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-458 shape`
  - `child task_id=linear-<issue-id>-docs-review`
  - `parent_run_id set`
  - `no accepted provider launch provenance`
  - `delegation-guard failure`
  - `provider-launched docs-review child streams`
  - `valid parent provider provenance/lineage`
  - `registered parent task prefix`
  - `ordinary unregistered top-level task ids`
  - `missing or mismatched provider provenance`
  - `registered-parent-prefix mismatch`
  - `parent/child task identity contract`
- Not done if:
  - CO-458 shape is not reproducible in focused coverage
  - valid provider parent plus docs-review child still fails `delegation-guard`
  - missing provider provenance passes
  - mismatched provider provenance passes
  - registered-parent-prefix mismatch passes
  - ordinary unregistered top-level task ids pass
  - this docs-only child lane edits source, tests, Linear, GitHub, PR, or workpad state
- Pre-implementation issue-quality review:
  - 2026-05-01: packet preserves both halves of the requested contract: valid provider docs-review children should pass, while unregistered or invalid provenance cases remain fail-closed.
  - 2026-05-01: packet explicitly names the parent/child identity contract and rejects blanket override or broad guard relaxation.
- Fallback / refactor decision:
  - Applies: `Yes`, because this lane touches fallback-shaped provider child task identity and guard compatibility.
  - Decision: expire the ambiguous `linear-<issue-id>-docs-review` identity shape unless it is backed by sanctioned provider parent proof or a registered parent prefix; retain strict provenance and task-registration failures as correctness contracts.
- Durable retention evidence:
  - `parent_run_id`, provider launch provenance, and `tasks/index.json` registration remain required proof surfaces.
- Large-refactor check:
  - A large refactor is not expected. Parent should widen only if the child-stream launch and guard contract cannot be aligned at the existing seams.

## Milestones & Sequencing
1. Register docs-first packet and task index entry.
2. Parent writes a focused CO-458 reproduction covering `linear-<issue-id>-docs-review`, `parent_run_id`, absent accepted provider provenance, and `delegation-guard` failure.
3. Parent inspects `orchestrator/src/cli/providerLinearChildStreamShell.ts` and chooses the identity fix:
   - inherit valid parent provider provenance/lineage into the docs-review child contract, or
   - use a docs-review child task id under a registered parent task prefix that guard accepts.
4. Parent updates `scripts/delegation-guard.mjs` and `scripts/lib/provider-run-contract.js` only as needed to make the chosen contract explicit and fail closed.
5. Parent preserves missing provenance, mismatched provenance, registered-parent-prefix mismatch, and ordinary unregistered top-level failures.
6. Parent updates worker-facing guard diagnostics or guidance so the failure points to the parent/child task identity contract.
7. Parent runs focused guard and provider child-stream tests, then selected broader validation/review gates.
8. Parent updates workpad, PR, and review handoff evidence after the real docs-review child-stream path is clean.

## Dependencies
- `scripts/delegation-guard.mjs`
- `scripts/lib/provider-run-contract.js`
- `orchestrator/src/cli/providerLinearChildStreamShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `tests/delegation-guard.spec.ts`
- `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `provider-linear-worker-child-streams.json`
- `provider-intake-state.json`
- `manifest.json`

## Validation
- Checks / tests:
  - child lane scoped JSON parse for `tasks/index.json`
  - child lane scoped protected-term scan across packet files
  - child lane `git diff --check` across owned files
  - parent-owned focused `tests/delegation-guard.spec.ts` runs for CO-458 reproduction, valid provider child success, missing provenance, mismatched provenance, registered-parent-prefix mismatch, and ordinary unregistered top-level rejection
  - parent-owned focused `orchestrator/tests/ProviderLinearChildStreamShell.test.ts` run for launch-side task identity
  - parent-owned broader build/lint/test/docs/review gates selected before handoff
- Rollback plan:
  - Revert only the task identity / guard contract patch if any fail-closed case starts passing incorrectly. Preserve this packet as issue traceability unless parent relaunches with widened scope.

## Risks & Mitigations
- Risk: guard accepts any `linear-*-docs-review` child id.
  - Mitigation: require `parent_run_id` plus sanctioned provider parent proof or registered parent-prefix proof and keep ordinary top-level rejection coverage.
- Risk: valid provider docs-review children still fail because launch-side task id and guard-side parent lookup disagree.
  - Mitigation: add a focused valid-parent docs-review child regression that executes guard against the chosen identity shape.
- Risk: provenance matching is weakened to clear the guard.
  - Mitigation: keep missing and mismatched provenance regressions fail-closed.
- Risk: parent-prefix repair accidentally accepts children under the wrong registered parent.
  - Mitigation: add registered-parent-prefix mismatch coverage.
- Risk: diagnostics suggest override text instead of the real contract.
  - Mitigation: update failure guidance to name parent provenance/lineage or registered parent prefix as the required proof.

## Approvals
- Reviewer: parent lane / docs-review pending
- Date: 2026-05-01
