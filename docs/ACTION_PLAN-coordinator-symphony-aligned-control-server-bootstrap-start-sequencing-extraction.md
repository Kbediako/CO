# ACTION_PLAN: Coordinator Symphony-Aligned Control Server Bootstrap Start Sequencing Extraction

## Docs-first

- [ ] Create PRD / TECH_SPEC / ACTION_PLAN / spec / checklist / `.agent` mirror for `1152`.
- [ ] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [ ] Capture local deliberation plus docs-review approval or explicit override for the generic bootstrap start sequencing seam.

## Implementation

- [ ] Introduce one adjacent helper for the ordered generic bootstrap start sequence.
- [ ] Rewire `controlServerBootstrapLifecycle.ts` to delegate that sequencing without changing the lifecycle contract.
- [ ] Keep focused bootstrap lifecycle regressions green without changing warn-and-continue startup behavior.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1152-.../manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1152`.
