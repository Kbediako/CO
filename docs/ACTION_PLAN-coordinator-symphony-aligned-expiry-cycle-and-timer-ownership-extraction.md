# ACTION_PLAN - Coordinator Symphony-Aligned Expiry Cycle and Timer Ownership Extraction

## Phase 1 - Docs and review handoff

- Register `1069` across PRD / TECH_SPEC / ACTION_PLAN / findings / spec mirror / checklist mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
- Capture delegated or local read-only approval that the next smallest Symphony-aligned seam is a dedicated expiry lifecycle owner, not a wider runtime abstraction.
- Capture docs-review evidence or an explicit override if the wrapper again drifts without new bounded findings.

## Phase 2 - Bounded extraction

- Add a dedicated expiry lifecycle owner under `orchestrator/src/cli/control/`.
- Move the raw recurring timer plus question/confirmation expiry sweep ownership out of `controlServer.ts`.
- Keep `controlServer.ts` explicit as the HTTP shell and preserve behavior with serialized sweeps.

## Phase 3 - Validation and closeout

- Run focused expiry-cycle regressions plus the standard guard bundle.
- Run standalone review and elegance review on the final tree.
- Record any broader runtime/process-lifecycle opportunities as a later slice instead of widening `1069`.
