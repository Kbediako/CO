# PRD: Coordinator Symphony-Aligned Standalone Review Run-Review Orchestration Boundary Reassessment

## Summary

After `1219`, the next truthful standalone-review move is broader than the closed helper-family cluster. The remaining candidate surface is the orchestration shell still owned by [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts).

## Problem

The recent standalone-review lanes extracted the obvious helper families, but `scripts/run-review.ts` still owns a large mixed orchestration surface:

- prompt/task-context assembly handoff into the runtime
- runtime resolution and review-command availability checks
- artifact preparation and non-interactive handoff logic
- child-process launch, output capture, and termination-boundary monitoring

It is not yet clear whether that remaining surface contains one truthful next bounded seam for native alignment, or whether the current wrapper shell should remain intact and no immediate extraction should be forced.

## Goal

Reassess the remaining `run-review.ts` orchestration surface and record whether any bounded next lane exists, or whether the correct result is another explicit stop signal.

## Non-Goals

- forcing a native rewrite or shell extraction without a live regression or coherent ownership boundary
- reopening the already-closed helper-family cluster around `review-execution-state`
- cosmetic cross-family dedupe such as shared `normalizeReviewCommandLine` extraction unless new evidence proves it belongs to one real contract
- changing runtime behavior, review semantics, or monitor thresholds in this registration-only lane

## Success Criteria

- docs-first artifacts capture the broader `run-review.ts` orchestration reassessment boundary
- the lane inspects `scripts/run-review.ts` together with the already-extracted review helper surfaces it coordinates
- the lane records whether a truthful next implementation seam exists for review-native alignment or whether the broader orchestration surface should remain unchanged for now
