# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Tracker Delegation

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1188`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the tracker-delegation seam. Evidence: `docs/findings/1188-orchestrator-run-lifecycle-task-manager-tracker-delegation-deliberation.md`, `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T123700Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Remove the local `attachPlanTargetTracker(...)` wrapper from `orchestrator.ts`. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/00-summary.md`
- [x] Delegate directly to `attachOrchestratorPlanTargetTracker(...)` from `createRunLifecycleTaskManager(...)`. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/00-summary.md`
- [x] Keep focused regressions on attach-after-success and no-attach-on-manager-failure behavior. Evidence: `orchestrator/tests/OrchestratorRunLifecycleTaskManagerRegistration.test.ts`, `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/05b-targeted-tests.log`

## Closeout

- [x] Run the standard gate bundle and capture closeout artifacts under `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/<timestamp>-closeout/`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/00-summary.md`
- [x] Run an explicit elegance review. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/12-elegance-review.md`
- [x] Record the next truthful seam after `1188`. Evidence: `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T122020Z-closeout/14-next-slice-note.md`
