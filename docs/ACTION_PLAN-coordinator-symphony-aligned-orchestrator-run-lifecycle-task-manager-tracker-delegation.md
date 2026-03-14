# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Tracker Delegation

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1188`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the tracker-delegation seam. Evidence: `docs/findings/1188-orchestrator-run-lifecycle-task-manager-tracker-delegation-deliberation.md`, `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/20260314T123700Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Remove the local `attachPlanTargetTracker(...)` wrapper from `orchestrator.ts`.
- [ ] Delegate directly to `attachOrchestratorPlanTargetTracker(...)` from `createRunLifecycleTaskManager(...)`.
- [ ] Keep focused regressions on attach-after-success and no-attach-on-manager-failure behavior.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1188`.
