# ACTION_PLAN - CO: Fix stale merge-handoff after successful provider-worker review handoff

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-40` / `dcfbd1cc-2b22-41dc-94c6-ce00c38258a2`
- Linear URL: https://linear.app/asabeko/issue/CO-40/co-fix-stale-merge-handoff-after-successful-provider-worker-review

## Summary
- Goal: finish `CO-40` by correcting the stale active-run classification that can survive a successful provider-worker review handoff and block later `Merging` continuation.
- Scope: docs-first packet, rerun child docs-review, artifact-backed baseline audit, narrow provider handoff reconciliation fix, focused regressions, closeout proof, required validation, and truthful workpad refreshes.
- Assumptions:
  - the current defect is narrow and centered on terminal-success proof not being used the same way as terminal-failure proof during run discovery/reconcile
  - `CO-30` and `CO-38` provide the real artifact baseline for the stale merge-handoff class
  - the review/merge workflow contracts already exist and only need truthful run-state input to work correctly

## Milestones & Sequencing
1. Register the CO-40 docs-first packet, task registry entry, docs freshness entries, and checklist mirror.
2. Rerun the audited child `docs-review` stream now that the packet exists; record the manifest directly if the wrapper again prepends logs and returns parse-invalid output.
3. Audit the required baseline files and capture a durable note explaining the stale merge-handoff seam across `CO-30` and `CO-38`.
4. Implement the narrow provider run status reconciliation fix so terminal successful proof can override stale `in_progress` manifest truth when safe.
5. Add focused regressions for stale running claim reclassification and later `Merging` continuation eligibility.
6. Produce a reviewer-usable closeout proof artifact tied to the real issue/PR merge-handoff class.
7. Run the required validation floor, standalone review, and elegance review; then refresh the workpad with the implementation and validation state.

## Dependencies
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`
- `/Users/kbediako/Code/CO/.runs/linear-f6e514fa-352e-4d82-97e2-08667e32e586/cli/2026-03-29T02-19-33-956Z-a40ae5da/provider-linear-worker-proof.json`
- `/Users/kbediako/Code/CO/.runs/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60/cli/2026-03-29T20-44-06-912Z-3f073605/manifest.json`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-40-docs-review --format json`
  - focused `ProviderIssueHandoff` regression command(s) for stale successful-proof merge-handoff behavior
  - `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run pack:smoke` if downstream-facing CLI/package surfaces change
- Rollback plan:
  - revert the proof-based success override if it misclassifies genuine active runs
  - keep the issue in an active implementation state until control-host/provider-intake truth is demonstrably correct

## Risks & Mitigations
- Risk: terminal-success proof is older than a legitimately resumed active manifest.
  - Mitigation: only trust terminal proof when its `updated_at` is at least as fresh as the manifest timestamp.
- Risk: fixing run status without updating summary/updated-at surfaces still leaves operator truth ambiguous.
  - Mitigation: keep status, summary, and updated-at derived from the same terminal-proof authority rule.
- Risk: the real stale merge-handoff path involves an additional refresh trigger beyond run status.
  - Mitigation: capture a closeout-proof artifact and add the second focused regression only if the first narrow fix is insufficient.

## Approvals
- Reviewer: Pending docs-review and implementation validation
- Date: 2026-03-30
