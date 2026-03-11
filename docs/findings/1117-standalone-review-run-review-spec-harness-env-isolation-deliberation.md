# 1117 Deliberation - Standalone Review Run-Review Spec Harness Env Isolation

## Decision

- Approve `1117` as the next bounded standalone-review reliability lane.

## Why This Slice

- `1116` closed the product-side diff-local citation contract.
- The remaining review-reliability evidence shows a separate harness-determinism seam: `tests/run-review.spec.ts` inherits ambient fake-Codex env knobs through `baseEnv()`, so operator shell state can mutate unrelated test outcomes.
- That makes harness env isolation the next smallest truthful step before considering broader whole-file splitting or deeper runtime changes.

## Evidence

- `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/00-summary.md`
- `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/09-review.log`
- `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/13-override-notes.md`
- `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/14-next-slice-note.md`

## Approval Notes

- Keep the primary seam in `tests/run-review.spec.ts`; do not reopen `scripts/run-review.ts` product logic first.
- Focus on ambient fake-Codex env leakage such as `RUN_REVIEW_MODE` and related harness-only knobs.
- Record explicitly if this improves reproducibility but does not fully solve whole-file `run-review.spec.ts` determinism.
