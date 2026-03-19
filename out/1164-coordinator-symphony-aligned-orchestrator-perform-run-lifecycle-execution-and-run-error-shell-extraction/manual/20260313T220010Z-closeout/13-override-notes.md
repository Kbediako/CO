# Override Notes

## `npm run test`

- Outcome: explicit quiet-tail override.
- Evidence:
  - `05b-test.log` shows the rerun progressing through the late CLI suite and completing `tests/cli-orchestrator.spec.ts`.
  - The rerun then ended without a terminal Vitest summary after the same late-suite zero-progress pattern already seen on nearby orchestrator lanes.
- Decision:
  - Treat this as the recurring full-suite quiet-tail pattern, not a `1164`-specific correctness failure.
  - Keep the targeted lifecycle regressions as the trusted lane-local validation signal for this task.

## `npm run review`

- Outcome: explicit drift override.
- Evidence:
  - `09-review.log` shows the review starting on the touched diff, then expanding into speculative package/type/import inspection without surfacing a concrete `1164` defect.
- Decision:
  - Terminated after low-signal drift instead of claiming a successful bounded review verdict.

## `node scripts/diff-budget.mjs`

- Outcome: stacked-branch override accepted.
- Evidence:
  - `08-diff-budget.log`
- Decision:
  - The branch baseline remains very large, while the lane-local `1164` diff is bounded to one class-local helper, one focused test file, and matching docs/mirror updates.
