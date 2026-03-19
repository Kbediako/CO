# 1094 Deliberation - Standalone Review Self-Containment Boundary

## Why this slice now

- `1093` fixed the primary `diff` vs `audit` surface conflation, but the post-fix live wrapper still broadened into adjacent review-system surfaces instead of converging on the bounded diff.
- That makes review reliability the next blocker before resuming the remaining Symphony control-server extraction seams.

## Evidence reviewed

- `scripts/run-review.ts`
- `scripts/lib/review-execution-state.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`
- `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/09-review.log`
- `out/1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split/manual/20260309T154039Z-closeout/14-next-slice-note.md`

## Decision

Open a bounded follow-on that teaches default `diff` review to treat review-system-adjacent docs/artifacts/helpers as their own off-task class, rather than reopening the now-correct `1093` surface split or jumping immediately to a native review rewrite.
