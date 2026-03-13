# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Cloud-Target Executor Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1157`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the cloud-target executor seam.

## Implementation

- [ ] Introduce one bounded cloud-target executor service adjacent to `orchestrator.ts`.
- [ ] Rewire `executeCloudPipeline(...)` to delegate the cloud-only execution body without changing public behavior.
- [ ] Move cloud-only prompt/config helpers with the cloud-target executor seam and keep focused cloud regressions green.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1157`.
