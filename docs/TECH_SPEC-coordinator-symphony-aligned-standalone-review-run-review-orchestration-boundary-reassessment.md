# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Run-Review Orchestration Boundary Reassessment

## Scope

This lane is a docs-first reassessment of the remaining orchestration shell in [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts) after the helper-family freeze captured in `1219`.

## In Scope

- `main()` orchestration across prompt context, scope notes, runtime selection, artifact preparation, and handoff logic
- `runCodexReview(...)` and `waitForChildExit(...)` as the remaining child execution and monitor shell
- the already-extracted helper surfaces that `run-review.ts` coordinates:
  - `scripts/lib/review-prompt-context.ts`
  - `scripts/lib/review-execution-state.ts`
  - `scripts/lib/review-execution-telemetry.ts`
  - command-intent / command-probe / shell-env helper families as directly-related neighbors when needed

## Out of Scope

- implementation changes to runtime behavior
- speculative native migration work without a proven next boundary
- helper-family symmetry extractions already ruled out in `1219`

## Questions To Answer

1. Does the remaining orchestration shell contain one bounded next seam that is more truthful than nearby alternatives?
2. If so, what is the narrowest credible lane?
3. If not, should the result be another explicit reassessment/no-op closeout rather than an extraction?
