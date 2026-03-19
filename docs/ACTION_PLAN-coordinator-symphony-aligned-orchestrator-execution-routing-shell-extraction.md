# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Execution-Routing Shell Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1159`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the execution-routing shell seam. Evidence: `docs/findings/1159-orchestrator-execution-routing-shell-extraction-deliberation.md`, `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Introduce one bounded execution-routing shell service adjacent to `orchestrator.ts`.
- [ ] Rewire `orchestrator.ts` to delegate mode-policy, runtime-selection/env merge, cloud preflight/fallback shaping, and local/cloud executor dispatch through that service without changing public behavior.
- [ ] Keep routing regressions green across mode resolution, cloud preflight/fallback, and local/cloud executor dispatch.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1159`.
