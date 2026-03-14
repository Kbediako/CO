# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Execution Routing Decision Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1184`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the execution-routing decision shell seam. Evidence: `docs/findings/1184-orchestrator-execution-routing-decision-shell-extraction-deliberation.md`, `out/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction/manual/20260314T091328Z-docs-first/04-docs-review.json`, `out/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction/manual/20260314T091328Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Extract one bounded execution-routing decision shell from `orchestratorExecutionRouter.ts`. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouteDecisionShell.ts`, `out/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction/manual/20260314T093516Z-closeout/00-summary.md`
- [x] Keep cloud/local route shell internals and route-state assembly out of scope. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`, `orchestrator/src/cli/services/orchestratorExecutionRouteDecisionShell.ts`, `out/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction/manual/20260314T093516Z-closeout/12-elegance-review.md`
- [x] Add focused regression coverage for runtime-selection fail-fast behavior, cloud/local branching, and fallback-adjusted downstream forwarding. Evidence: `out/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction/manual/20260314T093516Z-closeout/05b-targeted-tests.log`

## Closeout

- [x] Run the standard gate bundle and capture closeout artifacts under `out/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction/manual/20260314T093516Z-closeout/`. Evidence: `out/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction/manual/20260314T093516Z-closeout/00-summary.md`, `out/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction/manual/20260314T093516Z-closeout/13-override-notes.md`
- [x] Run an explicit elegance review. Evidence: `out/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction/manual/20260314T093516Z-closeout/12-elegance-review.md`
- [x] Record the next truthful seam after `1184`. Evidence: `out/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction/manual/20260314T093516Z-closeout/14-next-slice-note.md`
