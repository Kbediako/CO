# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Generic Speculative Dwell Boundary

1. Register `1115` across PRD / TECH_SPEC / ACTION_PLAN / findings / task checklist / `.agent` mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
2. Extend `scripts/lib/review-execution-state.ts` with a generic speculative-dwell detector that preserves legitimate small-diff revisits with concrete findings.
3. Add focused `tests/review-execution-state.spec.ts` and `tests/run-review.spec.ts` coverage for the generic-drift positive path, the same-small-diff concrete-revisit negative path, and preservation of the existing `1114` guard behavior.
4. Touch `scripts/run-review.ts` only if surfaced wording or termination plumbing must change after the detector lands.
5. Update `docs/standalone-review-guide.md`, run the docs-first guard bundle, then proceed into the implementation lane.
