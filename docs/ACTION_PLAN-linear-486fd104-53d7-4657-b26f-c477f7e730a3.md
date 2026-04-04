# ACTION_PLAN - CO: Make provider-worker closeout reporting authoritative and suppress deterministic invalid retries

## Added by Bootstrap 2026-04-04

## Traceability
- Linear issue: `CO-79` / `486fd104-53d7-4657-b26f-c477f7e730a3`
- Linear URL: https://linear.app/asabeko/issue/CO-79/co-make-provider-worker-closeout-reporting-authoritative-and-suppress
- Source issue: `CO-78` / `bea56fb8-c601-4554-8ece-0a63c5fd34bc`

## Summary
- Goal: land the smallest bounded provider-worker truthfulness fix so terminal failure, review telemetry, mutation classification, and runtime truth stay authoritative end to end.
- Scope: docs-first packet, single workpad bootstrap, audited docs-review child stream, provider-worker closeout audit, focused implementation and regression coverage, then the required validation/review floor.
- Assumptions:
  - provider-worker proof and command-runner closeout are the primary drift seams
  - deterministic invalid follow-up retries can be suppressed without weakening the existing Linear validation contract
  - proof-sidecar truth can be fixed in the current runtime aggregation seam without a broader status-system rewrite

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `provider-worker`, `manifest`, `run-summary`, `out/state`, `workpad closeout`, `review telemetry`, `linear_follow_up_parity_matrix_missing`, and the requirement that failed lanes read as failed everywhere that matters.
- Not done if:
  - any primary closeout surface still presents a terminal failure as clean or completed
  - deterministic invalid provider mutations still retry in the same attempt
  - proof sidecars still appear as active provider work
- Pre-implementation issue-quality review: approved as one bounded truthfulness lane over closeout, mutation suppression, and proof/runtime truth; historical backfill and model rewrites remain out of scope.

## Milestones & Sequencing
1. Register the `linear-486fd104-53d7-4657-b26f-c477f7e730a3` docs packet, task mirrors, and single Linear workpad with the initial truthfulness scope and acceptance criteria.
2. Run the audited `docs-review` child stream and fold the resulting approval into the task packet and registry mirrors.
3. Inspect the provider-worker proof, command-runner closeout, review telemetry, follow-up mutation, and runtime aggregation seams to identify the narrowest correct fix.
4. Implement the bounded repair and add focused regressions for mixed partial-success / terminal-failure closeout, deterministic invalid mutation suppression, and proof-sidecar truth.
5. Run the required validation floor plus standalone review and elegance review, then proceed to PR/handoff only if the lane reaches clean review-ready status.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/services/commandRunner.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- nearby focused tests under `orchestrator/tests/`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-486fd104-53d7-4657-b26f-c477f7e730a3 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-79-docs-review --format json`
  - focused provider-worker closeout/retry/runtime regressions for the final repair seam
  - `MCP_RUNNER_TASK_ID=linear-486fd104-53d7-4657-b26f-c477f7e730a3 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-486fd104-53d7-4657-b26f-c477f7e730a3 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-486fd104-53d7-4657-b26f-c477f7e730a3 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-486fd104-53d7-4657-b26f-c477f7e730a3 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-486fd104-53d7-4657-b26f-c477f7e730a3 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-486fd104-53d7-4657-b26f-c477f7e730a3 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-486fd104-53d7-4657-b26f-c477f7e730a3 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-486fd104-53d7-4657-b26f-c477f7e730a3 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-486fd104-53d7-4657-b26f-c477f7e730a3 FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-486fd104-53d7-4657-b26f-c477f7e730a3 npm run pack:smoke` only if downstream-facing CLI/package/review-wrapper surfaces change
- Rollback plan:
  - revert only the new closeout classification or runtime exclusion seam if it misclassifies healthy runs
  - keep deterministic invalid mutation suppression fail-closed rather than weakening validation rules

## Risks & Mitigations
- Risk: closeout truth is derived in multiple places and a narrow patch misses one surface.
  - Mitigation: audit every primary closeout builder up front and add cross-surface regression coverage.
- Risk: mutation suppression accidentally hides retryable transient failures.
  - Mitigation: suppress only explicitly deterministic invalid classifications with tests for retryable vs non-retryable behavior.
- Risk: proof-sidecar exclusion hides legitimate active provider work.
  - Mitigation: key the exclusion/finalization on proof-helper lineage and preserve true parent worker evidence.

## Approvals
- Reviewer: Pending `codex-orchestrator docs-review`
- Date: Pending
