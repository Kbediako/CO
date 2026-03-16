# PRD: Coordinator Symphony-Aligned Standalone Review Run-Review Orchestration Adapter Reassessment

## Summary

After `1226`, the nearby `run-review.ts` implementation seams appear locally exhausted. The truthful next move is a bounded reassessment / freeze lane before forcing another extraction around the remaining orchestration-owned adapter surface.

## Problem

The recent standalone-review `run-review.ts` sequence has already extracted the adjacent truthful seams:

- `1223` scope advisory preflight
- `1224` execution-boundary preflight
- `1225` non-interactive handoff
- `1226` telemetry writer shell

What remains nearby is:

- the inline `runReview` adapter into `runCodexReview(...)`
- broader wrapper orchestration around prompt shaping, manifest/artifact discovery, boundary-preflight wiring, and launch sequencing

Forcing another implementation slice here risks inventing a fake seam or externalizing orchestration glue without a live regression.

## Goal

Reassess the remaining `run-review.ts` orchestration adapter surface and record whether any truthful bounded implementation seam still exists or whether the correct result is an explicit no-op / freeze closeout.

## Non-Goals

- extracting the inline `runReview` adapter for symmetry alone
- reopening already-shipped prompt/context, boundary-preflight, non-interactive handoff, runtime, launch-attempt, or telemetry surfaces
- widening into a broad `run-review.ts` rewrite without a concrete defect or shared ownership boundary
- changing standalone-review runtime behavior, persisted telemetry schema, or CLI output contracts

## Success Criteria

- docs-first artifacts capture the reassessment boundary and likely no-op outcome
- the reassessment explicitly inspects the remaining orchestration-owned adapter surface in `scripts/run-review.ts`
- nearby alternatives are evaluated and rejected with concrete reasons when they are symmetry-driven rather than seam-driven
- the lane closes with either:
  - an exact next truthful implementation seam, or
  - an explicit freeze / no-op conclusion
