# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Run-Review Scope Advisory Preflight Shell Extraction

## Scope

This lane extracts the cohesive scope/advisory preflight shell from [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts) after `1222` removed the launch-attempt shell below it.

## In Scope

- `resolveEffectiveScopeMode(...)`
- `collectReviewScopePaths(...)`
- `buildScopeNotes(...)`
- `assessReviewScope(...)`
- `formatScopeMetrics(...)`
- the smallest directly-related helpers needed for threshold parsing, numstat aggregation, untracked-line counting, and large-scope advisory prompt/log emission

## Out of Scope

- prompt/task-context assembly in `scripts/lib/review-prompt-context.ts`
- artifact preparation, non-interactive handoff, and retry/failure capture in `scripts/lib/review-launch-attempt.ts`
- runtime resolution, child execution, and termination monitoring
- final telemetry shaping and persistence

## Requirements

1. Extract the scope/advisory preflight cluster into a dedicated helper/module.
2. Preserve current commit/base/uncommitted scope-note behavior, including rename/copy path rendering and path-only prompt notes.
3. Preserve current large-scope assessment semantics, including untracked-file line counting and threshold-based warning/advisory behavior.
4. Keep `run-review.ts` as the broader orchestration owner.
5. Add focused regression coverage for the extracted scope/advisory boundary.
