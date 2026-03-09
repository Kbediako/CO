# 1098 Deliberation - Standalone Review Canonical Scope-Summary Boundary

## Decision

- Approved as the next bounded review-reliability slice immediately after `1097`.
- Keep the seam inside `scripts/run-review.ts` prompt-side scope-summary assembly only.

## Why This Slice

- `1097` successfully reduced audit task context to canonical checklist/PRD path identity, but the final live review still broadened into older task-id/prompt-history inspection instead of concluding.
- The remaining prompt-side historical drift source is the git/branch/history-oriented scope summary, not the runtime classifier.
- Tightening scope-summary framing is smaller and safer than reopening `review-execution-state.ts` or replacing the wrapper.

## Evidence

- `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/00-summary.md`
- `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/09-review.log`
- `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/14-next-slice-note.md`

## Boundaries

- Do not change `review-execution-state.ts`.
- Do not reopen audit task-context shaping already completed in `1097`.
- Do not replace the wrapper with a native review controller in this slice.
- Do not reopen the next `controlServer.ts` product seam until this review slice lands.
