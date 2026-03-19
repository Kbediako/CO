# 1214 Deliberation Notes

- Date: 2026-03-15
- Task: `1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction`

## Scout Result

- After `1213`, the strongest truthful nearby follow-on is the shell-probe and heavy-command classifier cluster still local to `scripts/lib/review-execution-state.ts`.
- The inspection-target parsing seam is already extracted, and the broader stateful analyzer family is still too policy-coupled to force into a shared abstraction.
- The shell-probe/heavy-command cluster is deterministic, pure enough for a helper boundary, and already localized around review command-line prefiltering before stateful policy is applied.

## Evidence

- `scripts/lib/review-execution-state.ts:1826`
- `scripts/lib/review-execution-state.ts:1841`
- `scripts/lib/review-execution-state.ts:1860`
- `scripts/lib/review-execution-state.ts:1897`
- `scripts/lib/review-execution-state.ts:1909`
- `scripts/lib/review-execution-state.ts:1942`
- `scripts/lib/review-execution-state.ts:1965`
- `scripts/lib/review-execution-state.ts:1984`
- `scripts/lib/review-execution-state.ts:2000`
- `out/1213-coordinator-symphony-aligned-standalone-review-inspection-target-parsing-pipeline-extraction/manual/20260315T070736Z-closeout/14-next-slice-note.md`

## Decision

- Open a narrow shell-probe and heavy-command classification extraction lane inside `scripts/lib/review-execution-state.ts`.
- Do not widen into command-intent classification, meta-surface analysis, startup-anchor handling, review-boundary state updates, or `run-review` runtime work in the same slice.
- Keep inspection-target parsing, meta-surface normalization, and broader review-policy ownership out of scope.
