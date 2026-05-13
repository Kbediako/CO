# ACTION_PLAN - Fix Repeated Post-Merge Core Lane Failures in ProviderIssueHandoff and CLI Command Surface Suites

## Added by Bootstrap 2026-03-28

## Traceability
- Linear issue: `CO-31` / `4646e08c-5c53-4072-b09e-ec1aeff6fb21`
- Linear URL: https://linear.app/asabeko/issue/CO-31/co-fix-repeated-post-merge-core-lane-failures-in-providerissuehandoff

## Summary
- Goal: Finish `CO-31` by explaining and removing the repeated post-merge `Core Lane` failures on the CO-24 merge head.
- Scope: docs-first packet, GitHub Actions evidence capture, local reproduction/root-cause work on merge head `b81084ed121a59ca98f2b522ca1b5b602ceb54e8`, the smallest fix plus focused regressions, required validation, and normal review handoff.
- Assumptions:
  - the four failing tests may share a leaked timer/subprocess/runtime-state owner rather than being fully independent regressions
  - the smallest correct fix might touch test isolation, runtime lifecycle cleanup, or both
  - the Linear helper write-path anomaly is workflow noise unless it points to the same changed surface

## Milestones & Sequencing
1) Register the CO-31 docs-first packet, mirror the checklist, update `tasks/index.json`, refresh `docs/TASKS.md`, and keep trying to restore the single active Linear workpad comment if the mutation path becomes healthy.
2) Run docs-review for `linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21` before implementation.
3) Capture durable baseline evidence from the failing GitHub Actions run and reproduce or narrow the same failure shape locally with focused and ordered Vitest commands.
4) Inspect the implicated files and adjacent follow-up specs to determine whether the provider and CLI seams share one owner.
5) Implement the smallest fix, then add focused regressions for the exact failing cases and any required ordering/isolation contract.
6) Run the full validation floor, standalone review, and elegance review before PR/review handoff.

## Dependencies
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `tests/cli-command-surface.spec.ts`
- `orchestrator/src/cli/control/controlServerOwnedRuntimeLifecycle.ts`
- `vitest.config.core.ts`
- `vitest.config.ts`
- GitHub Actions run `23680994977` / job `68994221283`
- `tasks/specs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md`
- `tasks/specs/1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npx codex-orchestrator start docs-review --format json --no-interactive --task linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21`
  - focused reproduction commands for `orchestrator/tests/ProviderIssueHandoff.test.ts` and `tests/cli-command-surface.spec.ts`
  - ordered or repeated focused runs when needed to surface shared interaction
  - `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-4646e08c-5c53-4072-b09e-ec1aeff6fb21 npm run pack:smoke` if downstream-facing CLI/package/review-wrapper surfaces change
- Rollback plan:
  - revert the narrow fix if it changes behavior without eliminating the repeated failure pattern
  - if the root cause remains CI-only, keep the lane open until the artifact-backed classification and guard coverage are explicit

## Risks & Mitigations
- Risk: the failure only appears in full-lane order and resists single-file reproduction.
  - Mitigation: keep durable CI evidence and use ordered focused runs instead of guessing.
- Risk: the provider and CLI failures have separate owners, widening scope.
  - Mitigation: keep the investigation evidence-driven and only couple the fixes if a shared owner is proven.
- Risk: the Linear helper write path stays broken during the run.
  - Mitigation: keep repo docs/checklists current and record the mutation failure explicitly rather than silently dropping workflow state.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-28
