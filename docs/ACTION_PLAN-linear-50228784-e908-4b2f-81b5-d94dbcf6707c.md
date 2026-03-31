# ACTION_PLAN - CO: Machine-verify phase-scoped child-lane acceptance

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-52` / `50228784-e908-4b2f-81b5-d94dbcf6707c`
- Linear URL: https://linear.app/asabeko/issue/CO-52/co-machine-verify-phase-scoped-child-lane-acceptance

## Summary
- Goal: close the remaining `CO-35` trust-boundary gap by making phase-scoped child lanes machine-verifiable before parent acceptance.
- Scope: docs-first packet, audited docs-review child stream, repo-local phase contract, scope or proof or ledger updates, parent acceptance verification, focused regressions, and the required validation or review gates.
- Assumptions:
  - the smallest correct implementation is a repo-local versioned phase-to-path selector contract
  - file-scoped acceptance remains the reference behavior and should not be regressed
  - parent acceptance should recompute the expected contract instead of trusting persisted metadata blindly

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - keep `phase-scoped child lanes remain bounded helpers` and `before git apply` as hard constraints
- Not done if:
  - phase-only lanes still fail only because there is no contract data to machine-check
  - proof or ledger scope metadata can be widened or deleted without detection
- Pre-implementation issue-quality review:
  - source audit already proved the current gap is real in launch and acceptance code, so the implementation can stay tightly scoped to the phase contract and verification path

## Milestones & Sequencing
1. Register the `CO-52` docs-first packet, task registry entry, task snapshot, and freshness registry coverage on branch `linear/co-52-phase-scoped-child-lane-acceptance`.
2. Launch an audited `docs-review` child stream for the new packet and record the manifest or the explicit fallback if wrapper output is non-canonical in this worker lane.
3. Implement the phase contract helper plus scope, proof, ledger, and acceptance updates needed for phase-only launch and machine-checked parent acceptance.
4. Add focused regressions for valid phase-scoped acceptance, out-of-phase rejection, and stale or tampered scope data.
5. Run the required validation, standalone-review, and elegance-review gates; refresh the workpad; then prepare PR or review handoff only if the diff is clean.

## Dependencies
- `orchestrator/src/cli/providerLinearChildLaneShell.ts`
- `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/linearCliShell.ts`
- `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`
- `orchestrator/tests/LinearCliShell.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-50228784-e908-4b2f-81b5-d94dbcf6707c node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-52-docs-review --format json`
  - focused child-lane or CLI regression command(s)
  - `MCP_RUNNER_TASK_ID=linear-50228784-e908-4b2f-81b5-d94dbcf6707c node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-50228784-e908-4b2f-81b5-d94dbcf6707c node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-50228784-e908-4b2f-81b5-d94dbcf6707c npm run build`
  - `MCP_RUNNER_TASK_ID=linear-50228784-e908-4b2f-81b5-d94dbcf6707c npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-50228784-e908-4b2f-81b5-d94dbcf6707c npm run test`
  - `MCP_RUNNER_TASK_ID=linear-50228784-e908-4b2f-81b5-d94dbcf6707c npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-50228784-e908-4b2f-81b5-d94dbcf6707c npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-50228784-e908-4b2f-81b5-d94dbcf6707c DIFF_BUDGET_OVERRIDE_REASON="CO-52 needs the required docs-first packet plus the smallest safe implementation slice for phase-scoped child-lane acceptance: one new phase-contract helper, parent acceptance changes, proof snapshot updates, and focused regressions." node scripts/diff-budget.mjs`
  - `TASK="linear-50228784-e908-4b2f-81b5-d94dbcf6707c" NOTES="Goal: validate CO-52 phase-scoped child-lane acceptance before handoff | Summary: add a machine-checkable phase-to-selector contract, enforce it in parent acceptance, persist scope-contract metadata in proof and ledger snapshots, and cover valid/rejected/tampered phase-scope cases | Risks: phase selector mapping could be too narrow or proof/ledger contract drift could still be misclassified" MANIFEST="$CODEX_ORCHESTRATOR_MANIFEST_PATH" FORCE_CODEX_REVIEW=1 DIFF_BUDGET_OVERRIDE_REASON="CO-52 needs the required docs-first packet plus the smallest safe implementation slice for phase-scoped child-lane acceptance: one new phase-contract helper, parent acceptance changes, proof snapshot updates, and focused regressions." npm run review -- --manifest "$CODEX_ORCHESTRATOR_MANIFEST_PATH" --base origin/main`
  - `MCP_RUNNER_TASK_ID=linear-50228784-e908-4b2f-81b5-d94dbcf6707c npm run pack:smoke`
- Rollback plan:
  - remove the phase-contract helper plus scope-metadata changes if selector verification proves incorrect
  - keep the issue active until phase-scoped acceptance is truthful end to end

## Risks & Mitigations
- Risk: phase names remain too vague and produce selectors that are too broad.
  - Mitigation: keep the first contract explicit, versioned, and fail-closed on unknown phases.
- Risk: persisted selector data can be tampered and silently widen acceptance.
  - Mitigation: recompute expected selectors from raw declared scope and compare both ledger and proof payloads before apply.
- Risk: file-scoped behavior regresses while adding phase support.
  - Mitigation: preserve file-scope as the reference path and keep targeted regressions for the existing file checks.

## Approvals
- Reviewer: Pending docs-review and implementation validation
- Date: 2026-03-31
