# ACTION_PLAN - CO: Make validation tests hermetic to host config and temp-workspace guardrails

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-54` / `06732957-908a-4f3e-96b5-bebb33fc612e`
- Linear URL: https://linear.app/asabeko/issue/CO-54/co-make-validation-tests-hermetic-to-host-config-and-temp-workspace

## Summary
- Goal: finish `CO-54` by keeping the two cited validation tests fully hermetic to temp-fixture and local-checkout state.
- Scope: docs-first packet, child docs-review, focused baseline reproduction, narrow test/fixture updates, focused and required validation, and review-ready workpad refreshes.
- Assumptions:
  - the active failure is the temp-fixture/package-fallback seam in `cli-frontend-test`, not a reopened global provider-env regression
  - `UserConfigStageSets` already handles the simple local case, but needs an explicit hostile-env regression to keep that contract pinned
  - a test-local fixture update is sufficient and smaller than changing the packaged runtime contract
- Current status:
  - milestones 1 through 5 are complete
  - local review closeout is clean, with no additional simplification warranted after the explicit elegance pass
  - remaining work is PR creation, CI/check drain, and review-state handoff

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `UserConfigStageSets.test.ts`
  - `cli-frontend-test.spec.ts`
  - `.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json`
  - `spec-guard command not found`
- Not done if:
  - the final tests still depend on repo-root `dist/` artifacts, package fallback, or host `.runs/local-mcp` state
  - the final evidence does not show the hostile-env seam for `UserConfigStageSets`
- Pre-implementation issue-quality review:
  - current truth narrowed after baseline reproduction: the live red case is temp-fixture/package-fallback dependence in `cli-frontend-test`; `UserConfigStageSets` is already green locally but still merits an explicit hostile-env regression

## Milestones & Sequencing
1. Register the `CO-54` docs-first packet, update `tasks/index.json`, refresh `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, mirror the checklist under `.agent/task/`, and create the single workpad.
2. Run the audited child `docs-review` stream and capture the manifest or an honest fallback note if the wrapper boundary fails.
3. Reproduce the focused baseline and pin the exact current truth in notes/workpad.
4. Implement the smallest test/fixture changes needed to keep `UserConfigStageSets` hostile-env-hermetic and `cli-frontend-test` self-contained.
5. Rerun the focused Vitest lane, then the required repo validation floor, followed by standalone review and an explicit elegance pass.
6. Refresh the workpad for handoff readiness, then proceed to PR/review state work only if validation is green.

## Dependencies
- `orchestrator/tests/UserConfigStageSets.test.ts`
- `tests/cli-frontend-test.spec.ts`
- `orchestrator/src/cli/config/userConfig.ts`
- `orchestrator/src/cli/utils/providerOverrideEnv.ts`
- `skills/linear/SKILL.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-54-docs-review --format json`
  - `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npx vitest run --config vitest.config.core.ts orchestrator/tests/UserConfigStageSets.test.ts tests/cli-frontend-test.spec.ts`
  - `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npm run build`
  - `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npm run test`
  - `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e FORCE_CODEX_REVIEW=1 npm run review`
- Rollback plan:
  - revert the test-local fixture changes if they accidentally stop exercising the real `frontend-test` CLI surface
  - keep the issue active until the focused Vitest lane proves the temp-fixture and hostile-env seams are gone

## Risks & Mitigations
- Risk: a minimal fixture config could accidentally stop testing the real CLI plumbing.
  - Mitigation: keep the test on the real `frontend-test` command path and retain assertions on the resulting runtime/manifest behavior.
- Risk: focusing only on `cli-frontend-test` could let the older host-config concern drift back later.
  - Mitigation: add an explicit hostile-env regression in `UserConfigStageSets` rather than relying on the current green local shell.
- Risk: the docs-review wrapper may still hit the known provider-worker boundary classification.
  - Mitigation: keep the underlying manifest or a manual fallback note explicit in the checklist/workpad instead of stalling.

## Approvals
- Reviewer: docs-review approved via `.runs/linear-06732957-908a-4f3e-96b5-bebb33fc612e-co-54-docs-review/cli/2026-03-31T08-25-28-926Z-ced6037e/manifest.json`; final standalone review telemetry is clean-success via `.runs/linear-06732957-908a-4f3e-96b5-bebb33fc612e-co-54-docs-review/cli/2026-03-31T08-25-28-926Z-ced6037e/review/telemetry.json`; explicit elegance pass completed with no additional code changes required
- Date: 2026-03-31
