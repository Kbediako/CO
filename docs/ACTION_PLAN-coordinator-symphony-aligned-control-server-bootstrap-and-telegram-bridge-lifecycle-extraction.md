# ACTION_PLAN - Coordinator Symphony-Aligned Control Server Bootstrap and Telegram Bridge Lifecycle Extraction

## Phase 1 - Docs and review handoff

- Register `1070` across PRD / TECH_SPEC / ACTION_PLAN / findings / spec mirror / checklist mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
- Capture local or delegated approval that the next bounded Symphony-aligned seam is post-bind bootstrap + Telegram bridge lifecycle ownership, not raw `listen()` ownership, another controller, or a runtime-wide abstraction.
- Capture docs-review evidence or an explicit override before implementation begins.

## Phase 2 - Bounded extraction

- Add a dedicated bootstrap/bridge lifecycle owner under `orchestrator/src/cli/control/`.
- Move post-bind auth/endpoint bootstrap, initial control-state persistence, and Telegram bridge lifecycle wiring out of `controlServer.ts`.
- Keep `controlServer.ts` explicit as the outer server shell, bind/listen owner, and request dispatcher.

## Phase 3 - Validation and closeout

- Run focused startup/bridge lifecycle regressions plus the standard guard bundle, preserving the existing bind/listen failure tests.
- Run standalone review and elegance review on the final tree.
- Record any broader runtime/process-owner opportunities as later slices instead of widening `1070`.
