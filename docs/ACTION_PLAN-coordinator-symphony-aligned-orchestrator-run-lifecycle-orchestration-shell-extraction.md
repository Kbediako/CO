# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Orchestration Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1190`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the orchestration-shell seam. Evidence: `docs/findings/1190-orchestrator-run-lifecycle-orchestration-shell-extraction-deliberation.md`, `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/20260314T125616Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Extract the remaining `performRunLifecycle(...)` orchestration shell from `orchestrator.ts`. Evidence: `orchestrator/src/cli/services/orchestratorRunLifecycleOrchestrationShell.ts`, `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/20260314T130757Z-closeout/00-summary.md`
- [x] Move or delegate the current `runLifecycleGuardAndPlanning(...)` and `executeRunLifecycleTask(...)` through the same shell move. Evidence: `orchestrator/src/cli/services/orchestratorRunLifecycleOrchestrationShell.ts`, `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/20260314T130757Z-closeout/00-summary.md`
- [x] Keep focused regressions on privacy-guard reset, guard short-circuit behavior, run-error ordering, and completion semantics. Evidence: `orchestrator/tests/OrchestratorRunLifecycleGuardAndPlanning.test.ts`, `orchestrator/tests/OrchestratorRunLifecycleExecutionAndRunError.test.ts`, `orchestrator/tests/OrchestratorRunLifecycleOrchestrationShell.test.ts`, `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/20260314T130757Z-closeout/05b-targeted-tests.log`

## Closeout

- [x] Run the standard gate bundle and capture closeout artifacts under `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/20260314T130757Z-closeout/`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/20260314T130757Z-closeout/00-summary.md`
- [x] Run an explicit elegance review. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/20260314T130757Z-closeout/12-elegance-review.md`
- [x] Record the next truthful seam after `1190`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/20260314T130757Z-closeout/14-next-slice-note.md`
