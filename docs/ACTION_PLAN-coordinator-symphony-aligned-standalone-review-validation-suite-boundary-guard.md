# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Validation-Suite Boundary Guard

## Phase 1 - Docs and evidence

- Register `1066` across PRD / TECH_SPEC / ACTION_PLAN / task checklist / `.agent` mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
- Capture `1064` / `1065` closeout evidence plus the existing command-intent boundary posture as the basis for the new slice.

## Phase 2 - Bounded implementation

- Promote explicit package-manager validation suites into a default bounded failure from the shared `ReviewExecutionState`.
- Teach `scripts/run-review.ts` to terminate on that state while preserving `CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1`.
- Keep the wrapper shell thin and avoid policy widening beyond the explicit suite list.

## Phase 3 - Validation and closeout

- Run targeted standalone-review regressions plus standard guards.
- Run `pack:smoke`.
- Record any remaining broader child-process or review-autonomy gaps as the next slice, not as silent debt.
