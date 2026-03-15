# PRD: Coordinator Symphony-Aligned Standalone Review Execution Runtime Shell Extraction

## Summary

After `1220`, the next truthful standalone-review implementation seam is the child execution and termination-monitor shell still owned by [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts).

## Problem

`run-review.ts` still owns one cohesive runtime cluster that is lower-level than the higher-order orchestration in `main()`:

- spawning the review child process
- wiring output capture and stdio mirroring
- constructing and observing `ReviewExecutionState`
- enforcing timeout / stall / startup-loop / command-intent / shell-probe / meta-surface termination handling
- settling process output and wrapping failures into `CodexReviewError`

That execution runtime shell is now the narrowest truthful next extraction boundary, but it has not yet been lifted into its own first-class module.

## Goal

Extract the child execution and termination-monitor shell from `scripts/run-review.ts` into a dedicated standalone-review runtime helper while preserving the current public behavior and keeping higher-level orchestration in `main()`.

## Non-Goals

- changing review semantics, termination thresholds, or runtime selection behavior
- moving prompt/task-context assembly, non-interactive handoff, scope advisories, or telemetry write/retry ownership out of `main()`
- widening the lane into a full wrapper-to-native rewrite

## Success Criteria

- `runCodexReview(...)` and `waitForChildExit(...)` ownership is moved behind a dedicated runtime shell/helper boundary
- `main()` remains responsible for prompt/runtime/handoff orchestration, scope shaping, and telemetry write/retry behavior
- targeted regressions prove the extracted runtime shell preserves child execution, bounded termination, and failure-wrapping behavior
