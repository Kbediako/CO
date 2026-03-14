# Task Checklist - 1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation

- MCP Task ID: `1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md`
- TECH_SPEC: `tasks/specs/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md`

> This lane follows the completed `1187` tracker-shell extraction. The next bounded Symphony-aligned move is to remove the now-empty local tracker wrapper without reopening broader lifecycle or registration ownership.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md`, `tasks/specs/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md`, `tasks/tasks-1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md`, `.agent/task/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md`
- [x] Deliberation/findings captured for the tracker-delegation seam. Evidence: `docs/findings/1188-orchestrator-run-lifecycle-task-manager-tracker-delegation-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md`, `docs/findings/1188-orchestrator-run-lifecycle-task-manager-tracker-delegation-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1188`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T123700Z-docs-first/05-docs-review-override.md`

## Tracker Delegation Cleanup

- [x] `orchestrator.ts` no longer defines a private `attachPlanTargetTracker(...)` wrapper. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/00-summary.md`
- [x] `createRunLifecycleTaskManager(...)` delegates directly to `attachOrchestratorPlanTargetTracker(...)` without changing registration assembly or broader lifecycle authority. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/00-summary.md`
- [x] Focused regressions preserve attach-after-success and no-attach-on-manager-failure behavior. Evidence: `orchestrator/tests/OrchestratorRunLifecycleTaskManagerRegistration.test.ts`, `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/05-test.log`
- [x] `npm run docs:check`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/08-diff-budget.log`
- [x] `npm run review`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/09-review.log`
- [x] `npm run pack:smoke`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/10-pack-smoke.log`
- [x] Elegance review completed. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/12-elegance-review.md`
