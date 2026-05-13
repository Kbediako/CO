# ACTION_PLAN - CO: Prevent provider-worker env override leakage into repo validation

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-42` / `aadbe46e-9e5a-4810-b9fb-52afe70d73a3`
- Linear URL: https://linear.app/asabeko/issue/CO-42/co-prevent-provider-worker-env-override-leakage-into-repo-validation

## Summary
- Goal: finish `CO-42` by making provider-worker repo-config/package-root overrides lane-local so repo validation stays deterministic in worker shells.
- Scope: docs-first packet, child docs-review, focused env propagation audit, narrow sanitization changes, focused regressions, workflow note updates, required validation, and review-ready workpad refreshes.
- Assumptions:
  - the current defect is environmental, not a deeper pipeline-selection bug
  - provider-worker launch still legitimately needs the control-host-owned repo config override
  - the false failures seen in `CO-40` can be reproduced and then cleared with a bounded env boundary fix

## Milestones & Sequencing
1. Register the `CO-42` docs-first packet, task registry entry, docs freshness entries, and checklist mirrors.
2. Run the audited child `docs-review` stream after packet registration and capture the manifest.
3. Reproduce the current leak seam under provider-worker env, focusing on `loadUserConfig`, provider child streams, and the two cited tests.
4. Implement the smallest env sanitization boundary that preserves provider-worker behavior while removing repo-local validation/test leakage.
5. Add or update focused regressions proving the two cited tests stay green in a provider-worker shell.
6. Update the relevant provider-worker / validation notes so the intentionally propagated env is explicit.
7. Run the required validation floor, standalone review, and elegance review; then refresh the workpad for handoff readiness.

## Dependencies
- `orchestrator/src/cli/controlHostCliShell.ts`
- `orchestrator/src/cli/config/userConfig.ts`
- `orchestrator/src/cli/providerLinearChildStreamShell.ts`
- `orchestrator/src/cli/services/commandRunner.ts`
- `orchestrator/tests/UserConfigStageSets.test.ts`
- `tests/cli-frontend-test.spec.ts`
- `skills/linear/SKILL.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-42-docs-review --format json`
  - focused reproduction and rerun for `orchestrator/tests/UserConfigStageSets.test.ts`
  - focused reproduction and rerun for `tests/cli-frontend-test.spec.ts`
  - `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run pack:smoke` if downstream-facing CLI/package/review-wrapper surfaces change
- Rollback plan:
  - revert the sanitization helper/boundary if it strips env that provider-owned commands genuinely require
  - keep the issue active until the false-failure class is proven gone under provider-worker shell state

## Risks & Mitigations
- Risk: scrubbing `CODEX_ORCHESTRATOR_PACKAGE_ROOT` too broadly could break packaged helper invocation.
  - Mitigation: keep the strip boundary narrow and preserve explicit invocation paths that already route through the package root when needed.
- Risk: only fixing tests could leave real child validation lanes exposed.
  - Mitigation: patch the shared lane boundary first, then use the focused tests as proof that the ambient leakage is gone.
- Risk: provider-worker docs become stale again if the boundary is implicit.
  - Mitigation: update the workflow notes in the same lane and include the rule in the workpad closeout.

## Approvals
- Reviewer: Pending docs-review and implementation validation
- Date: 2026-03-30
