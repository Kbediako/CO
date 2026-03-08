# ACTION_PLAN - Coordinator Symphony-Aligned Control Event Transport Extraction

## Phase 1 - Docs and review handoff

- Register `1071` across PRD / TECH_SPEC / ACTION_PLAN / findings / spec mirror / checklist mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
- Capture local or delegated approval that the next bounded Symphony-aligned seam is control-event transport ownership, not request-context extraction or another controller slice.
- Capture docs-review evidence or an explicit override before implementation begins.

## Phase 2 - Bounded extraction

- Add a dedicated control event transport owner under `orchestrator/src/cli/control/`.
- Move control-event append plus SSE/runtime fan-out out of `controlServer.ts`.
- Keep `controlServer.ts` explicit as the outer server shell, request-context owner, and route dispatcher.

## Phase 3 - Validation and closeout

- Run focused event-transport regressions plus the standard guard bundle.
- Run standalone review and elegance review on the final tree.
- Record any remaining request-context extraction opportunity as a later slice instead of widening `1071`.
