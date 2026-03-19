# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Audit Task-Context Boundary

## Phase 1 - Docs and registration

- Register `1097` across PRD / TECH_SPEC / ACTION_PLAN / task checklist / `.agent` mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
- Capture the post-`1096` rationale that the next bounded review-reliability seam is audit task-context slimming before the next product seam.

## Phase 2 - Bounded implementation

- Narrow the audit-only task-context builder in `scripts/run-review.ts` to path-oriented context.
- Remove embedded PRD summary injection from audit prompts.
- Keep audit evidence surfaces, task inference, and meta-surface guard behavior unchanged.

## Phase 3 - Validation and closeout

- Update focused `tests/run-review.spec.ts` prompt-shape assertions.
- Run the standard validation lane plus pack-smoke.
- Run a live bounded review pass to confirm the wrapper stays task-aware without overloading audit prompts.
