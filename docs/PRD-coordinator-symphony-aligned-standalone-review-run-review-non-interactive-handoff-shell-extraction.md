# PRD: Coordinator Symphony-Aligned Standalone Review Run-Review Non-Interactive Handoff Shell Extraction

## Summary

After `1224`, the next truthful standalone-review implementation seam is the remaining non-interactive handoff block still owned by [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts).

## Problem

`run-review.ts` still owns one cohesive post-prompt handoff contract between prompt assembly and the extracted execution-boundary/launch helpers:

- preparing review artifacts beside the manifest review directory
- deriving `nonInteractive` from explicit CLI state plus environment/TTY fallback
- exporting `MANIFEST`, `RUNNER_LOG`, and `RUN_LOG` into the review environment
- short-circuiting to the printed handoff prompt when live review execution is intentionally suppressed

Leaving that block inline keeps `run-review.ts` responsible for lower-level handoff preparation that no longer belongs beside prompt assembly, execution-boundary preflight, launch-attempt execution, and final telemetry/reporting.

## Goal

Extract the remaining non-interactive handoff shell from `scripts/run-review.ts` into a dedicated standalone-review helper while preserving current artifact creation, env export, printed handoff messaging, and non-interactive suppression behavior.

## Non-Goals

- changing prompt context or scope-advisory behavior
- changing execution-boundary preflight or launch-attempt runtime behavior
- changing telemetry persistence, final reporting, manifest bootstrap, or diff-budget handling
- widening the lane into CLI/help-text changes or a broader `runReview` / `writeTelemetry` adapter extraction

## Success Criteria

- the post-prompt non-interactive handoff shell is extracted behind a dedicated helper/module
- `run-review.ts` keeps higher-level orchestration ownership for prompt context, boundary preflight, launch execution, monitoring, and final telemetry/closeout behavior
- focused regressions prove artifact creation, env export behavior, and printed handoff short-circuiting remain behavior-preserving
