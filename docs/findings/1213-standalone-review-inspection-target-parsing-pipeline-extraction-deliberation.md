# 1213 Deliberation Notes

- Date: 2026-03-15
- Task: `1213-coordinator-symphony-aligned-standalone-review-inspection-target-parsing-pipeline-extraction`

## Scout Result

- After `1212`, the strongest truthful nearby follow-on is the inspection-target parsing pipeline still local to `scripts/lib/review-execution-state.ts`.
- The normalization substrate is already extracted, and the broader stateful analyzer family is still too policy-coupled to force into a shared abstraction.
- The four-function parsing cluster already feeds command-line inspection-target recording, narrative target extraction, and touched-path-aware matching, making it the next honest structural seam.

## Evidence

- `scripts/lib/review-execution-state.ts:1129`
- `scripts/lib/review-execution-state.ts:1256`
- `scripts/lib/review-execution-state.ts:2065`
- `scripts/lib/review-execution-state.ts:2094`
- `scripts/lib/review-execution-state.ts:2113`
- `scripts/lib/review-execution-state.ts:2173`
- `out/1212-coordinator-symphony-aligned-standalone-review-operand-path-normalization-boundary-extraction/manual/20260315T062628Z-closeout/14-next-slice-note.md`

## Decision

- Open a narrow inspection-target parsing extraction lane inside `scripts/lib/review-execution-state.ts`.
- Do not widen into command-intent, shell-probe, startup-anchor, summary, or shell-env traversal/state handling in the same slice.
- Keep operand/path normalization ownership, shell-command parser ownership, and `run-review` runtime behavior out of scope.
