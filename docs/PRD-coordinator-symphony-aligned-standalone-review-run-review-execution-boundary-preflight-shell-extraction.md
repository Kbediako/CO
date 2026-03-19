# PRD: Coordinator Symphony-Aligned Standalone Review Run-Review Execution-Boundary Preflight Shell Extraction

## Summary

After `1223`, the next truthful standalone-review implementation seam is the remaining execution-boundary preflight block still owned by [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts).

## Problem

`run-review.ts` still owns one cohesive pre-launch execution-boundary contract above the call into `runCodexReview(...)`:

- normalizing the bounded review mode and runtime/boundary preflight options
- resolving environment-driven timeout and startup-loop guard configuration
- shaping the execution-boundary config passed into the runtime helper
- keeping wrapper-local guidance strings and failure semantics aligned with that preflight

Leaving that block inline keeps `run-review.ts` responsible for lower-level execution-boundary setup that no longer belongs beside prompt assembly, scope advisory shaping, final telemetry persistence, and post-review closeout reporting.

## Goal

Extract the remaining execution-boundary preflight shell from `scripts/run-review.ts` into a dedicated standalone-review helper while preserving current bounded-mode, timeout/startup-loop, audit/architecture/diff-mode, and launch-guidance behavior.

## Non-Goals

- changing prompt context, scope-advisory behavior, or manifest/diff-budget handling
- changing runtime termination policy or child-process lifecycle behavior in `scripts/lib/review-execution-runtime.ts`
- changing telemetry schema/redaction or final reporting behavior
- widening the lane into CLI/help-text changes or new wrapper abstractions beyond the pre-launch execution-boundary shell

## Success Criteria

- the execution-boundary preflight block is extracted behind a dedicated helper/module
- `run-review.ts` keeps higher-level orchestration ownership for prompt context, scope advisory, runtime invocation, live monitoring, and final telemetry/closeout behavior
- focused regressions prove bounded-mode/env parsing and launch-boundary shaping remain behavior-preserving
