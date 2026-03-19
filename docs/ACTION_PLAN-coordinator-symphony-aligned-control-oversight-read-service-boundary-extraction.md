# ACTION_PLAN: Coordinator Symphony-Aligned Control Oversight Read Service Boundary Extraction

## Docs-first

- [ ] Create PRD / TECH_SPEC / ACTION_PLAN / spec / checklist / `.agent` mirror for `1148`.
- [ ] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [ ] Capture local deliberation plus docs-review approval for the coordinator-owned oversight read-service seam.

## Implementation

- [ ] Introduce one coordinator-owned oversight read service beneath the facade.
- [ ] Rewire `controlOversightFacade.ts` to consume the new read service instead of the Telegram-named adapter.
- [ ] Keep focused coordinator and Telegram regressions green.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1148-.../manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1148`.
