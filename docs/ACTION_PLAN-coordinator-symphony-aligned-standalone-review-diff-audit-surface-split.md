# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Diff/Audit Surface Split

## Phase 1 - Docs and registration

- Register `1093` across PRD / TECH_SPEC / ACTION_PLAN / task checklist / `.agent` mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
- Capture the current mixed-surface evidence from `run-review.ts`, `review-execution-state.ts`, and the recent `1060` / `1085` / `1091` closeouts.

## Phase 2 - Bounded implementation

- Add an explicit review surface selector with default `diff`.
- Split prompt assembly so `diff` omits audit/checklist/evidence context.
- Keep `audit` as the explicit broader verification path.
- Preserve the existing runtime guards as backstops rather than replacing them.

## Phase 3 - Validation and closeout

- Add prompt-contract tests and bounded review-path regressions.
- Run the standard validation lane plus `pack:smoke`.
- Record whether the surface split materially reduces drift; if not, open the next native-review seam explicitly.
