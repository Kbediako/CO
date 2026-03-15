# PRD: Coordinator Symphony-Aligned Standalone Review Prompt Context Review-Support Classification

## Summary

After `1207` extracted the prompt/context helper from `scripts/run-review.ts`, the standalone-review support-family classifier in `scripts/lib/review-execution-state.ts` still does not recognize the new helper and its direct spec as `review-support` surfaces.

## Problem

The review-execution-state classifier currently enumerates older standalone-review helper files and adjacent specs as `review-support`, but it omits:

- `scripts/lib/review-prompt-context.ts`
- `dist/scripts/lib/review-prompt-context.js`
- `tests/review-prompt-context.spec.ts`

That leaves the newly extracted prompt-context family outside the same bounded-support taxonomy that already applies to `run-review`, `review-execution-state`, and `review-scope-paths`.

## Goal

Classify the prompt-context helper family as `review-support` without widening into new prompt behavior, runtime changes, or another abstraction pass inside `run-review`.

## Non-Goals

- changing prompt text or task-context behavior
- changing runtime selection, monitoring, telemetry, or termination boundaries
- extracting another helper from `run-review`
- changing architecture/audit surface semantics beyond the support-family classification gap

## Success Criteria

- `scripts/lib/review-execution-state.ts` recognizes the prompt-context helper and its direct spec as `review-support`
- focused review-execution-state coverage proves the new paths are treated like other adjacent standalone-review support files
- the lane stays local to support-family classification and does not widen back into prompt/context extraction work
