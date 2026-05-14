# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Verdict Stability Guard

1. Register `1114` across PRD / TECH_SPEC / ACTION_PLAN / findings / task checklist / `.agent` mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
2. Extend `scripts/lib/review-execution-state.ts` with a bounded verdict-stability / no-progress detector that reuses existing review execution signals.
3. Wire the new boundary into `scripts/run-review.ts` so bounded review terminates with an explicit reason when speculative dwell stops producing new diff-relevant progress.
4. Add focused `tests/review-execution-state.spec.ts` and `tests/run-review.spec.ts` coverage for the positive and negative cases.
5. Update `docs/standalone-review-guide.md`, run the docs-first guard bundle, then proceed into the implementation closeout lane.
