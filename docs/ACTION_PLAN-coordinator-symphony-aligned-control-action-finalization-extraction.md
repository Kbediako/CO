# ACTION_PLAN - Coordinator Symphony-Aligned Control Action Finalization Extraction

## Phase 1 - Docs / Boundary Confirmation

- Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1055`.
- Record the next `/control/action` seam as finalization extraction, not a broader controller rewrite.
- Capture docs-review approval or an explicit override before implementation.

## Phase 2 - Finalization Extraction

- Add `controlActionFinalization.ts` and move replay/applied response plus audit payload shaping into it.
- Keep `controlServer.ts` limited to route authority, side-effect execution, and raw response writes.
- Preserve existing replay precedence, canonical ids, traceability, and success payload contracts exactly.

## Phase 3 - Validation / Closeout

- Add direct helper tests and confirm existing `/control/action` regressions still pass.
- Run the standard validation lane and record any honest docs-review or stacked-branch overrides.
- Sync task/docs mirrors to completed and record the next bounded seam after finalization extraction.
