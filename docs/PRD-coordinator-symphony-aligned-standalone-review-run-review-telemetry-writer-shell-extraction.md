# PRD: Coordinator Symphony-Aligned Standalone Review Run-Review Telemetry Writer Shell Extraction

## Summary

After `1225`, the next truthful standalone-review implementation seam is the remaining telemetry-writer callback still owned by [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts).

## Problem

`run-review.ts` still owns one bounded post-launch callback contract that no longer belongs beside wrapper orchestration:

- assembling the persisted telemetry payload for success and failure cases
- inferring the default termination boundary when failure callers do not provide one
- persisting the telemetry payload beside the review output log
- logging persistence failure as a non-fatal wrapper error

That logic already overlaps with the extracted execution-telemetry surface and the canonical `ReviewExecutionState.buildTelemetryPayload(...)` contract, but it remains duplicated inline inside `run-review.ts`.

## Goal

Extract the remaining telemetry-writer shell from `scripts/run-review.ts` into the execution-telemetry surface while preserving current payload schema, persistence behavior, failure fallback semantics, and stderr logging.

## Non-Goals

- extracting the sibling `runReview` callback or forcing a paired/symmetric adapter split
- changing runtime execution, execution-boundary preflight, non-interactive handoff, or launch-attempt retry behavior
- changing persisted telemetry schema, stderr telemetry summary wording, or termination-boundary semantics
- widening the lane into review-support/touched-family rewiring unless a concrete new path is introduced

## Success Criteria

- the inline telemetry-writer callback is removed from `scripts/run-review.ts`
- telemetry payload assembly flows through the canonical execution-state/telemetry helpers instead of duplicating termination-boundary and summary logic inline
- focused regressions prove success/failure telemetry persistence and persistence-failure logging remain behavior-preserving
- `run-review.ts` remains the orchestration owner for prompt assembly, execution-boundary preflight, runtime launch, and the inline `runReview` adapter
