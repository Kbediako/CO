# ACTION_PLAN - CO: Stabilize implementation-gate when nested npm run test hangs after green tail

## Added by Bootstrap 2026-04-01

## Traceability
- Linear issue: `CO-57` / `fdefaeca-8c14-4dc3-980e-cdc6cfa6d955`
- Linear URL: https://linear.app/asabeko/issue/CO-57/co-stabilize-implementation-gate-when-nested-npm-run-test-hangs-after

## Summary
- Goal: make `implementation-gate` expose truthful in-flight progress during long-running `npm run test` stages so provider-worker operators do not misdiagnose a live run as stalled and trigger cleanup that degrades the result.
- Scope: docs-first registration, audited docs-review attempt, current-tree reproduction, narrow lifecycle heartbeat fix, focused regressions plus evidence notes, required validation, and normal review handoff.
- Assumptions:
  - the underlying repo-wide quiet-tail family may still exist, but this issue is bounded to the gate-owned heartbeat-truth seam
  - the current provider-worker Linear write rate limit will clear after the reset window and can be retried later in the same lane
  - the smallest correct fix lives in the execution lifecycle rather than a broad test-harness rewrite

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - keep the lane about `implementation-gate`
  - preserve explicit distinction between active progress and genuine failing tests
  - preserve references to `npm run test:orchestrator`, `esbuild --service`, and `exit 128`
- Not done if:
  - raw-manifest readers still see a stale heartbeat during an active long-running `test` stage
  - the shipped change hides or relabels real test failures as success
- Pre-implementation issue-quality review:
  - approved as a narrow implementation-gate stabilization lane after reviewing the current pipeline config, the lifecycle and command execution paths, historical `CO-24` / `1307` packets, and the concrete `CO-56` reproduction notes in the issue body

## Milestones & Sequencing
1. Register the CO-57 docs-first packet, update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`, mirror the checklist to `.agent/task/`, and prepare the single Linear workpad body locally while Linear writes are rate-limited.
2. Run `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-57-docs-review --format json` and record the manifest-backed result before implementation. If it ends `failed-other`, record the tooling failure separately and continue with a manual docs review fallback.
3. Reproduce the current issue shape through the implementation-gate path, confirm whether the run truly hangs, and capture the later-suite plus heartbeat evidence.
4. Implement the smallest lifecycle heartbeat fix, then add focused regression coverage and an issue-scoped evidence note for that path.
5. Run the required validation floor, standalone review, and explicit elegance pass, then retry Linear state/workpad sync and prepare the review handoff.

## Dependencies
- `codex.orchestrator.json`
- `package.json`
- `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`
- lifecycle regression coverage under `orchestrator/tests/`
- historical reference packets `docs/PRD-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md` and `docs/TECH_SPEC-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-57-docs-review --format json`
  - current-tree reproduction of the late-suite / stale-manifest symptom
  - `npm run test:orchestrator -- orchestrator/tests/OrchestratorExecutionLifecycle.test.ts`
  - `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-validation node dist/bin/codex-orchestrator.js start implementation-gate --task linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-validation --format json --no-interactive`
  - `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 npm run pack:smoke` if downstream-facing CLI, package, or skill surfaces change
- Rollback plan:
  - revert the lifecycle heartbeat fix if it widens beyond the heartbeat-truth seam or disturbs ordinary failure handling
  - if a future run still reproduces a real post-suite linger after this fix, keep that as a follow-up lane instead of broadening this issue silently

## Risks & Mitigations
- Risk: current-tree reproduction diverges from the stale `CO-56` artifact path.
  - Mitigation: treat the issue body as historical context only and recapture current evidence in this workspace.
- Risk: the current tree still hides a separate post-suite linger beyond the stale-manifest defect.
  - Mitigation: keep the current fix minimal, document the validated scope, and open a follow-up only if fresh evidence reproduces that narrower residual problem.
- Risk: Linear writes remain blocked during the docs-first stage.
  - Mitigation: keep local packet and workpad draft current, record the exact reset time, and retry the packaged writes after `2026-03-31T15:28:20.250Z`.

## Approvals
- Reviewer: docs-review child stream recorded a model-capacity `failed-other`; manual docs review fallback accepted
- Date: 2026-04-01
