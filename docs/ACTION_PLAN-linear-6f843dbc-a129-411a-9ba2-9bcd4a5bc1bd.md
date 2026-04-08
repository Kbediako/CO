# ACTION_PLAN - linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd

## Summary
- Goal: make ordinary `provider-linear-worker` execution record and enforce an explicit same-issue child-lane eligibility decision instead of leaving ordinary adoption latent behind prompt wording.
- Scope: docs-first packet, audited docs-review child stream, structured parent-only decision helper, proof/debug hydration, prompt/runner enforcement, focused regressions, and replay proof artifacts.
- Assumptions:
  - `CO-35`, `CO-52`, `CO-56`, `CO-68`, and `CO-82` contracts are already present in the active tree and can be reused directly.
  - existing provider audit summaries are the safest persisted source for current-turn decision truth because live proof writes already rehydrate from them.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `provider-linear-worker`, `linear child-lane --action launch|accept|reject|invalidate`, `provider-linear-worker-proof.json`, `provider-linear-worker-child-lanes.json`, `child_lanes`, `provider_debug_snapshot`, ordinary eligible issues, same-issue child-lane parallelisation, and machine-checkable eligibility decision.
- Not done if: the ordinary worker still ends active turns with silent `child_lanes: []`, or `parallelize_now` does not actually launch a child lane.
- Pre-implementation issue-quality review: approved. The lane is the narrow ordinary-adoption seam, not a broader scheduler rewrite, docs-only wording pass, or follow-up splitter.

## Milestones & Sequencing
1. Create the CO-101 packet, task mirrors, registry entries, branch, and single workpad, then run audited `linear child-stream --pipeline docs-review --stream co-101-docs-review`.
2. Implement the structured parent-only parallelisation decision helper, proof/debug hydration, prompt wording, and runner enforcement for missing decisions or `parallelize_now` without launched child lanes.
3. Add focused regressions for decision routing, proof hydration, explicit serial/no-go visibility, and ordinary parallelization enforcement.
4. Capture ordinary-worker replay artifacts for both the `parallelize_now` and explicit serial/no-go outcomes.
5. Run the required validation floor, standalone review, and explicit elegance pass, then refresh the workpad for PR/review handoff.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/linearCliShell.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`
- `orchestrator/src/cli/control/providerIssueObservability.ts`
- `skills/linear/SKILL.md`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/LinearCliShell.test.ts`
- `orchestrator/tests/ProviderIssueObservability.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-101-docs-review --format json`
  - focused regressions for ordinary decisioning, launch/non-launch recording, and debug projection
  - replay proof capture for `parallelize_now` and `stay_serial` or `forbid_parallel`
  - required repo validation floor after implementation
- Rollback plan:
  - revert the bounded decision helper, proof hydration, and prompt enforcement changes together so ordinary worker behavior returns to the pre-CO-101 baseline without partially persisted decision semantics.

## Risks & Mitigations
- Risk: live runner proof writes overwrite the decision if the source of truth is kept only in memory.
  - Mitigation: reconstruct the current decision from the provider audit summary during each proof refresh.
- Risk: the decision helper becomes a docs-only suggestion that workers can ignore.
  - Mitigation: fail the provider-worker turn closed when an active ordinary turn ends without a recorded decision or when `parallelize_now` records no child lane.
- Risk: the lane drifts into new artifact families or broader observability redesign.
  - Mitigation: keep the decision projected only through the existing proof/debug surfaces and focused replay evidence.

## Approvals
- Reviewer: pending `codex-orchestrator docs-review`
- Date: pending
