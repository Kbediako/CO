# ACTION_PLAN - Coordinator Symphony-Aligned Control Action Controller Sequencing Extraction

## Phase 1 - Docs / Boundary Confirmation

- Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1056`.
- Record the next `/control/action` seam as controller sequencing extraction, not a broader route rewrite.
- Capture docs-review approval or an explicit override before implementation.

## Phase 2 - Sequencing Extraction

- Add a dedicated controller-sequencing helper that owns replay, confirmation gating/resolution, and execution handoff decisions.
- Keep `controlServer.ts` limited to request reading/normalization, authority, side-effect execution, and raw response writes.
- Preserve replay precedence, confirmation semantics, transport re-validation, and final success/error contracts exactly.

## Phase 3 - Validation / Closeout

- Add direct helper tests and confirm existing `/control/action` regressions still pass.
- Run the standard validation lane and record any honest docs-review, delegation-guard, or stacked-branch overrides.
- Sync task/docs mirrors to completed and record the next bounded seam after controller sequencing extraction.
