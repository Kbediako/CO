# ACTION_PLAN - CO: Reconcile provider-worker child-stream delegation evidence with delegation guard

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-56` / `fabdf855-dd07-4f8d-8ffa-f02d22cb27be`
- Linear URL: https://linear.app/asabeko/issue/CO-56/co-reconcile-provider-worker-child-stream-delegation-evidence-with

## Summary
- Goal: make `delegation-guard` accept valid workspace-scoped provider-worker child manifests while preserving fail-closed delegation enforcement.
- Scope: docs-first registration, delegated docs-review, narrow `delegation-guard` search-root fix, focused regressions, provider-worker guidance updates, and the required validation/review lane.
- Assumptions:
  - top-level provider-worker runs will continue to inherit a shared-root `CODEX_ORCHESTRATOR_RUNS_DIR` during validation
  - child-stream and child-lane helpers should keep sanitizing child artifacts into the issue workspace's `.runs` root
  - the active manifest and workspace path provide enough audited metadata to derive the sanctioned extra search root without broad filesystem guesses

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve provider-worker delegation enforcement
  - preserve workspace-scoped child-stream and child-lane execution
  - reject blanket `DELEGATION_GUARD_OVERRIDE_REASON` as the routine answer when valid child evidence exists
- Not done if:
  - `delegation-guard` still misses valid workspace-scoped child-stream or child-lane manifests
  - the change weakens top-level enforcement or widens into unrelated artifact-root refactoring
- Pre-implementation issue-quality review:
  - approved as a narrow provider-worker delegation evidence reconciliation lane after rechecking the live issue state, current env contract, and child helper behavior

## Milestones & Sequencing
1. Register the CO-56 docs-first packet, update `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, mirror the checklist to `.agent/task/`, and keep the single Linear workpad current.
2. Run `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json` and record the outcome before implementation.
3. Implement the narrow provider-worker-aware delegated-manifest search-root expansion in `scripts/delegation-guard.mjs` and add focused regressions for the workspace-path success and fail-closed absence cases.
4. Update provider-worker guidance so documented child-stream / child-lane evidence expectations match the guard behavior.
5. Run the required validation floor, then standalone review and an explicit elegance pass before any PR or review handoff.

## Dependencies
- `scripts/delegation-guard.mjs`
- `tests/delegation-guard.spec.ts`
- `orchestrator/src/cli/providerLinearChildStreamShell.ts`
- `orchestrator/src/cli/providerLinearChildLaneShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `skills/linear/SKILL.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`
  - `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run build`
  - `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run test`
  - `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be npm run pack:smoke` if downstream-facing CLI/package/skills surfaces change
- Rollback plan:
  - revert the guard search-root expansion and the matching docs updates together if the provider-worker-only derivation proves too broad or incorrect
  - keep the issue in `In Progress` and refresh the same workpad instead of switching to override text silently

## Risks & Mitigations
- Risk: the fix accidentally broadens guard search to unrelated directories.
  - Mitigation: derive extra roots only from the active provider-worker manifest/workspace contract and dedupe explicitly.
- Risk: documentation says workspace-scoped child evidence should work but the guard still only checks the shared root.
  - Mitigation: add focused regression tests around the exact mixed-root env seen in provider-worker runs.
- Risk: downstream guidance changes require extra packaging validation.
  - Mitigation: run `pack:smoke` if CLI/package/skill surfaces change.

## Approvals
- Reviewer: codex-orchestrator docs-review
- Date: 2026-03-31
