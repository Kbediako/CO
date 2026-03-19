# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Execution Runtime Shell Extraction

## Scope

This lane extracts the cohesive child execution runtime shell from [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts) after the reassessment captured in `1220`.

## In Scope

- `runCodexReview(...)`
- `waitForChildExit(...)`
- the directly-related runtime helpers those functions own today, such as output drain/settlement and signal-forwarding helpers when they are runtime-local

## Out of Scope

- prompt/task-context assembly
- runtime selection
- non-interactive handoff
- scope notes / large-scope advisory shaping
- telemetry write/retry policy

## Requirements

1. Extract the child execution and termination-monitor shell into a dedicated helper/module.
2. Preserve existing `ReviewExecutionState` integration and `CodexReviewError` behavior.
3. Keep `main()` as the higher-level orchestration owner.
4. Add focused regression coverage for the extracted runtime boundary.
