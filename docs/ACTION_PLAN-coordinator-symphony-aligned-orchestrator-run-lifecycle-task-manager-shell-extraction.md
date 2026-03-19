# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1189`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the task-manager shell seam. Evidence: `docs/findings/1189-orchestrator-run-lifecycle-task-manager-shell-extraction-deliberation.md`, `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124000Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Extract the remaining `createRunLifecycleTaskManager(...)` shell from `orchestrator.ts`. Evidence: `orchestrator/src/cli/services/orchestratorRunLifecycleTaskManagerShell.ts`, `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/00-summary.md`
- [x] Remove the one-call-site local `createTaskManager(...)` forwarding wrapper as part of the same move. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/00-summary.md`
- [x] Keep focused regressions on manager creation, attach-after-success behavior, and no-attach-on-manager-failure behavior. Evidence: `orchestrator/tests/OrchestratorRunLifecycleTaskManagerRegistration.test.ts`, `orchestrator/tests/OrchestratorRunLifecycleExecutionAndRunError.test.ts`, `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/05b-targeted-tests.log`

## Closeout

- [x] Run the standard gate bundle and capture closeout artifacts under `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/00-summary.md`
- [x] Run an explicit elegance review. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/12-elegance-review.md`
- [x] Record the next truthful seam after `1189`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/14-next-slice-note.md`
