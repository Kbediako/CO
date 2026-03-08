# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Command-Intent Boundary Guard

## Phase 1 - Docs and evidence

- Register `1061` across PRD / TECH_SPEC / ACTION_PLAN / task checklist / `.agent` mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
- Capture the `1060` closeout evidence as the basis for the new slice.

## Phase 2 - Bounded implementation

- Extend `ReviewExecutionState` with explicit command-intent boundary classification.
- Teach `scripts/run-review.ts` to terminate on that distinct failure reason.
- Keep the wrapper shell thin and artifact-first.

## Phase 3 - Validation and closeout

- Run targeted standalone-review regressions plus standard guards.
- Run `pack:smoke`.
- Record any remaining broader review-autonomy gap as the next slice, not as silent debt.
