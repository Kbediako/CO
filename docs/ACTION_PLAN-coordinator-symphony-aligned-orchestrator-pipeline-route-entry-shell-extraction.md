# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Pipeline Route Entry Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1192`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the route-entry shell seam. Evidence: `docs/findings/1192-orchestrator-pipeline-route-entry-shell-extraction-deliberation.md`, `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/20260314T141414Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Extract the remaining `executePipeline(...)` route-entry callback shell from `orchestrator.ts`. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouteAdapterShell.ts`, `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/20260314T142557Z-closeout/00-summary.md`
- [x] Keep callback passthrough for runtime selection, cloud execution, auto-scout, and subpipeline restart behavior exact. Evidence: `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/services/orchestratorExecutionRouteAdapterShell.ts`, `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/20260314T142557Z-closeout/00-summary.md`
- [x] Preserve focused regressions around route-entry callback wiring and nearby route-adapter behavior in `OrchestratorExecutionRouteAdapterShell.test.ts`, `OrchestratorCloudAutoScout.test.ts`, and `OrchestratorSubpipelineFailure.test.ts`. Evidence: `orchestrator/tests/OrchestratorExecutionRouteAdapterShell.test.ts`, `orchestrator/tests/OrchestratorCloudAutoScout.test.ts`, `orchestrator/tests/OrchestratorSubpipelineFailure.test.ts`, `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/20260314T142557Z-closeout/05b-targeted-tests.log`

## Closeout

- [x] Run the standard gate bundle and capture closeout artifacts under `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/20260314T142557Z-closeout/`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/20260314T142557Z-closeout/00-summary.md`
- [x] Run an explicit elegance review. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/20260314T142557Z-closeout/12-elegance-review.md`
- [x] Record the next truthful seam after `1192`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/20260314T142557Z-closeout/14-next-slice-note.md`
