# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Local-Pipeline Executor Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1158`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the local-pipeline executor seam.

## Implementation

- [ ] Introduce one bounded local pipeline executor service adjacent to `orchestrator.ts`.
- [ ] Rewire the non-cloud branch of `executePipeline(...)` to delegate the local-only execution body without changing public behavior.
- [ ] Keep command-stage execution, subpipeline recursion, already-completed skip handling, and child-run shaping green under focused regressions.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1158`.
