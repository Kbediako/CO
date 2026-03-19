# PRD: Coordinator Symphony-Aligned Standalone Review Execution Telemetry Surface Extraction

## Summary

After `1216`, the next truthful standalone-review seam is no longer in path-family classification. The remaining bounded helper family is the execution telemetry payload, redaction, persistence, summary logging, and failure-boundary inference cluster still owned by `scripts/lib/review-execution-state.ts` and consumed by `scripts/run-review.ts`.

## Problem

`review-execution-state` still mixes state accumulation with telemetry serialization and persistence concerns. The logic that shapes persisted telemetry payloads, sanitizes and redacts output, infers termination boundaries from failure text, and prints the stderr telemetry summary is deterministic and already serves a nearby consumer boundary in `run-review.ts`, but it is not yet owned by its own extraction seam.

## Goal

Extract the bounded execution telemetry surface from `scripts/lib/review-execution-state.ts` into a helper boundary that `scripts/run-review.ts` can consume without changing review-state accumulation, command/meta-surface policy, or runtime semantics.

## Non-Goals

- reopening command-probe, command-intent, inspection-target, or meta-surface analysis families already closed in `1209` through `1216`
- changing review-state counters, rolling buffers, startup-anchor policy, relevant-reinspection policy, or timeout behavior
- changing the persisted telemetry schema, stderr telemetry summary wording, or termination-boundary semantics except where required to preserve existing behavior through the extraction
- widening into prompt shaping, manifest resolution, or other `run-review.ts` orchestration work outside the telemetry handoff

## Success Criteria

- the execution telemetry payload/persistence family is owned by a bounded helper seam
- `review-execution-state` keeps live state accumulation and boundary policy ownership while reusing the extracted telemetry helper
- `run-review.ts` keeps the same persisted telemetry contract, stderr summary contract, and failure-boundary behavior
- focused regressions prove telemetry payload shaping, termination-boundary inference, redaction, persistence, and summary logging remain unchanged
