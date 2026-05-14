# PRD - Coordinator Symphony-Aligned Standalone Review Canonical Scope-Summary Boundary

## Summary

`1097` removed checklist/PRD body preload from audit prompts, but live review still drifted toward historical branch/task context through the remaining git scope summary and prompt-side scope notes. This slice narrows that remaining scope-summary surface so standalone review stays oriented around canonical changed-file identity instead of branch-history framing.

## Problem

- `run-review.ts` still appends git-derived scope summaries that include branch/ahead status and broad uncommitted-file context.
- Even after audit task context became checklist/PRD-path only, review runs still anchored on broader history/task context instead of concluding on the bounded audit target.
- The remaining drift source is prompt-side scope-summary assembly, not the runtime/meta-surface classifier.

## Goals

- Keep standalone review aware of the canonical changed-file set without leaning on branch-history framing.
- Reduce prompt pressure toward historical/contextual drift once task identity is already established.
- Keep the change narrowly bounded to prompt-side scope-summary assembly in `scripts/run-review.ts`.
- Preserve the existing review runtime, review-surface split, and `review-execution-state.ts` ownership.

## Non-Goals

- Replacing the wrapper with a native review controller in this slice.
- Changing `review-execution-state.ts`.
- Reopening audit task-context shaping already completed in `1097`.
- Reopening the next product/controller extraction seam in the same slice.

## User-Facing Outcome

- `npm run review` still shows the reviewer the bounded files it should inspect.
- Review prompts stop emphasizing branch-history metadata that encourages off-target historical inspection.
- The review wrapper moves closer to a Symphony-style bounded shell: explicit task identity, explicit changed-surface identity, minimal historical preload.
