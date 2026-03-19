# PRD: Coordinator Symphony-Aligned Standalone Review Launch-Attempt Orchestration Shell Extraction

## Summary

After `1221`, the next truthful standalone-review implementation seam is the remaining launch-attempt orchestration cluster still owned by [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts).

## Problem

`run-review.ts` still owns one cohesive launch-attempt boundary that sits above the extracted runtime execution shell but below the top-level wrapper handoff:

- resolving the review runtime context
- checking review-command availability
- building scoped and unscoped review arguments
- resolving the final command invocation
- preparing prompt/output artifacts
- capturing review-failure doctor issue logs
- deciding whether a scoped failure should retry without scope flags

That cluster is now the narrowest truthful next extraction boundary. Leaving it inline keeps `run-review.ts` responsible for lower-level launch-attempt policy that no longer belongs beside prompt assembly, non-interactive handoff, and final telemetry persistence.

## Goal

Extract the launch-attempt orchestration shell from `scripts/run-review.ts` into a dedicated standalone-review helper while preserving current scoped/unscoped retry behavior, failure capture behavior, and runtime command resolution semantics.

## Non-Goals

- changing prompt/context assembly, non-interactive handoff, or review-surface advisory behavior
- reopening the already-extracted execution runtime boundary in `scripts/lib/review-execution-runtime.ts`
- moving final telemetry shaping or persistence out of `run-review.ts`
- widening the lane into a broader wrapper-to-native rewrite

## Success Criteria

- the launch-attempt cluster is extracted behind a dedicated helper/module
- `run-review.ts` keeps top-level wrapper ownership for prompt assembly, non-interactive handoff, live monitor messaging, and final telemetry persistence
- focused regressions prove scoped launch, unscoped retry fallback, and failure issue-log capture remain behavior-preserving
