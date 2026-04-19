# ACTION_PLAN - CO-260 bounded unattended local_rollout executor

## Added by Docs Child Lane 2026-04-19

## Summary
- Goal: create the docs-first packet for a bounded unattended executor that runs allowlisted post-merge `local_rollout` actions through `operator-autopilot` / `control-host` continuity.
- Scope: docs packet, repo-tracked action contract, merged-closeout execution gate, machine-readable attempt audit, success-only lifecycle resolution, focused parent tests, and parent-owned validation/review.
- Assumptions:
  - CO-206-style `local_rollout` lifecycle remains the starting point.
  - Parent lane will reconcile authoritative Linear issue/workpad wording before implementation.
  - Initial executor scope is local-only and does not include implicit production deployment.
  - Shared-root sync is already handled by deterministic merge closeout.
  - Source-fresh execution must reuse the existing source-authoritative runner path.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `bounded unattended local_rollout executor`
  - `allowlisted post-merge local_rollout actions`
  - `operator-autopilot/control-host continuity`
  - `repo-tracked executable action contract`
  - `deploy-class opt-in`
  - `authoritative merged-closeout truth gate`
  - `provider-operator-autopilot.jsonl`
  - `provider-operator-autopilot-lifecycle.json`
- Not done if:
  - action ids are not repo-tracked, enabled, ordered, and deploy-class gated
  - undeclared or arbitrary shell actions can execute
  - execution can happen without current merged-closeout truth
  - dirty repo, wrong branch, missing binary, unsupported host, ambiguous target, missing config, or undeclared action fails open
  - success does not resolve pending `local_rollout`
  - failed or skipped execution clears pending `local_rollout`
  - attempt audit lacks action id, preflight result, timestamps, terminal state, or durable reason
- Pre-implementation issue-quality review:
  - The issue is an executor follow-on, not a lifecycle-only patch and not a generic hook system.
  - Existing shared-root sync and source-authoritative execution seams must be reused, not replaced.
  - This child lane is docs-only and should not implement source changes.

## Milestones & Sequencing
1. Parent imports this docs packet and verifies it against the authoritative Linear issue/workpad.
2. Parent runs docs-review or records an explicit bounded docs-review fallback before source edits.
3. Define the repo-tracked `local_rollout` action contract: action id, order, enabled flag, supported host/platform, deploy class, and checked-in allowlist mapping.
4. Add the executor seam near `operator-autopilot` / `control-host` so it selects only unresolved `ProviderOperatorAutopilotPendingActionRecord` records with current merged-closeout truth.
5. Implement fail-closed preflight for dirty repo, wrong branch, missing binary, unsupported host, ambiguous target, missing config, and undeclared action.
6. Run enabled actions in deterministic order through the source-authoritative runner path and record machine-readable started + terminal attempt records with `succeeded|skipped|failed` terminal outcomes.
7. Resolve the matching `local_rollout` lifecycle only after all required actions succeed and the terminal execution audit is durably written; leave skipped/failed/interrupted/audit-failed actions operator-visible with durable reason text.
8. Add restart/rehydrate handling so persisted started or terminal attempts prevent duplicate execution, preserve reason text after control-host restart, and retry lifecycle clearing after transient lifecycle-store failures.
9. Add focused tests for success, preflight skip, command failure, restart/rehydrate persistence, undeclared action refusal, shared-root seam preservation, and source-runner reuse.
10. Run parent-owned scoped validation, required repo gates, standalone review, and elegance pass before PR handoff.

## Dependencies
- Source surfaces:
  - `orchestrator/src/cli/control/providerOperatorAutopilot.ts`
  - `orchestrator/src/cli/control/providerOperatorAutopilotLifecycle.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/utils/packageProgramResolver.ts`
  - `codex.orchestrator.json`
- Test surfaces:
  - focused operator-autopilot tests
  - focused provider handoff / rehydrate tests
  - focused source-runner or command-runner tests if execution routing is touched
- Docs/registry surfaces in this child lane:
  - `docs/PRD-CO-260-local-rollout-executor.md`
  - `tasks/specs/CO-260-local-rollout-executor.md`
  - `docs/ACTION_PLAN-CO-260-local-rollout-executor.md`
  - `tasks/index.json`

## Validation
- Child-lane checks:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8'))"`
  - protected-term scan across the three CO-260 packet files
  - `git diff --check -- docs/PRD-CO-260-local-rollout-executor.md tasks/specs/CO-260-local-rollout-executor.md docs/ACTION_PLAN-CO-260-local-rollout-executor.md tasks/index.json`
- Parent implementation checks:
  - focused success test
  - focused preflight skip tests for every unsafe reason
  - focused command failure test
  - focused restart/rehydrate persistence test
  - focused undeclared action refusal test
  - focused seam tests proving shared-root sync remains merge closeout and execution uses source-authoritative runner resolution
  - required parent validation floor and manifest-backed standalone review
- Rollback plan:
  - revert executor source/test/config changes together.
  - preserve docs packet if the issue remains open for a corrected bounded implementation.
  - do not delete lifecycle, attempt, merge-closeout, or provider-intake evidence during rollback.

## Risks & Mitigations
- Risk: executor becomes a generic shell runner.
  - Mitigation: require checked-in action id allowlist and reject undeclared actions before preflight.
- Risk: executor runs in an unsafe worktree.
  - Mitigation: fail closed with `skipped` reason for dirty repo, wrong branch, missing binary, unsupported host, ambiguous target, or missing config.
- Risk: executor duplicates merge closeout shared-root sync.
  - Mitigation: keep shared-root sync in `providerMergeCloseout.ts` and add seam-preservation tests.
- Risk: source checkout executes stale `dist`.
  - Mitigation: route CO-owned actions through existing source-authoritative runner resolution and test it.
- Risk: failed/skipped attempts hide required operator work.
  - Mitigation: leave pending `local_rollout` unresolved and project durable reason text in read-model output.
- Risk: success clears the wrong action identity.
  - Mitigation: resolve lifecycle only for the exact `action_instance_id` that passed merged-closeout truth and action execution.

## Approvals
- Reviewer: pending parent lane docs-review.
- Date: pending.
