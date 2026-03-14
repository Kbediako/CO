# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Execution Mode Policy Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1185`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the execution-mode policy seam. Evidence: `docs/findings/1185-orchestrator-execution-mode-policy-extraction-deliberation.md`, `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/20260314T094429Z-docs-first/04-docs-review.json`, `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/20260314T094429Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Extract one bounded execution-mode policy helper from `orchestratorExecutionRouter.ts`.
- [ ] Keep route decision shell behavior, route-state assembly, and cloud/local shell internals out of scope.
- [ ] Keep focused regression coverage on unchanged execution-mode policy semantics.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1185`.
