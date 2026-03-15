# 1211 Deliberation Notes

- Date: 2026-03-15
- Task: `1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction`

## Scout Result

- `1210` required a docs-first reassessment of the deeper helper families before another extraction claim; this note is that reassessment output rather than an automatic parity follow-on.
- After `1210`, the strongest truthful nearby follow-on is the shared shell-command parser family inside `scripts/lib/review-execution-state.ts`.
- The same parser primitives now feed heavy-command detection, shell-probe detection, command-intent parsing, meta-surface parsing, startup-anchor parsing, and inspection-target extraction.
- This is a real structural seam rather than another parity-only follow-up because the cluster is already reused across multiple review-boundary analyzers, and it is a sharper first substrate than the previously named operand/path-normalization or shell-traversal candidates.

## Evidence

- `scripts/lib/review-execution-state.ts:1746`
- `scripts/lib/review-execution-state.ts:1753`
- `scripts/lib/review-execution-state.ts:1836`
- `scripts/lib/review-execution-state.ts:1945`
- `scripts/lib/review-execution-state.ts:2012`
- `scripts/lib/review-execution-state.ts:2114`
- `scripts/lib/review-execution-state.ts:2136`
- `scripts/lib/review-execution-state.ts:2240`
- `scripts/lib/review-execution-state.ts:2347`
- `scripts/lib/review-execution-state.ts:2535`
- `scripts/lib/review-execution-state.ts:2607`
- `scripts/lib/review-execution-state.ts:2661`
- `out/1210-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-review-support-classification/manual/20260315T043157Z-closeout/14-next-slice-note.md`

## Decision

- Open a narrow shell-command parser primitives extraction lane inside `scripts/lib/review-execution-state.ts`.
- Keep command-intent, shell-probe, meta-surface, startup-anchor, and heavy-command policy analyzers in `review-execution-state` so the lane stays structural rather than behavioral.
- Keep shell-env interpretation in `scripts/lib/review-shell-env-interpreter.ts` and do not widen into output-summary or `run-review` runtime work.
