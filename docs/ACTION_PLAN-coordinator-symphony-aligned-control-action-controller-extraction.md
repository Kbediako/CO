# ACTION_PLAN - Coordinator Symphony-Aligned Control Action Controller Extraction

## Phase 1 - Docs / Boundary Confirmation

- Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1057`.
- Record the next `/control/action` seam as the standalone controller extraction after `1056`.
- Preserve the explicit CO authority boundary in the task docs instead of copying Symphony literally.

## Phase 2 - Controller Extraction

- Add a dedicated `/control/action` controller module under `orchestrator/src/cli/control/`.
- Move route-local orchestration into that controller while keeping persistence, runtime publish, audit emission, and response/error writes explicit through injected callbacks/adapters.
- Reduce `controlServer.ts` to route matching plus dependency wiring for this surface.

## Phase 3 - Validation / Closeout

- Add direct controller coverage and confirm existing `/control/action` regressions still pass.
- Run the standard validation lane and record any honest delegation/docs-review/review overrides.
- Sync task/docs mirrors to completed and record the next bounded seam after controller extraction.
