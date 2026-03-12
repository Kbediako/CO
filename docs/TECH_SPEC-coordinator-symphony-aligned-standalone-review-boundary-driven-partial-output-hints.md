---
id: 20260312-1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints
title: Coordinator Symphony-Aligned Standalone Review Boundary-Driven Partial Output Hints
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints.md
risk: medium
owners:
  - Codex
last_review: 2026-03-12
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Boundary-Driven Partial Output Hints

## Summary

Replace the legacy `error.timedOut` partial-log hint branch with a boundary-driven decision derived from the existing first-class `termination_boundary` families.

## Current State

`scripts/run-review.ts` still prints `Review output log (partial)` on the primary and retry failure paths when:
- the thrown error is a `CodexReviewError`
- `error.timedOut === true`

That behavior predates the current boundary taxonomy. After `1130`-`1136`, the real failure family already exists on `terminationBoundary.kind`, but the partial-log hint has not been aligned to it.

## Symphony Alignment Note

This is the next smallest truthful post-`1136` seam. The wrapper already carries explicit boundary families; the partial-output hint should follow that source of truth instead of an older transport-oriented boolean.

## Proposed Design

### 1. Add a small helper for partial-output hint eligibility

Keep the runtime contract local to `scripts/run-review.ts`.

Introduce a helper that returns true only for boundary families that should still surface `Review output log (partial)`:
- `timeout`
- `stall`
- `startup-loop`

### 2. Switch primary and retry failure paths to the helper

Replace the existing `error.timedOut` checks on both failure paths with the new boundary-driven helper.

### 3. Preserve telemetry and failure classification

Do not alter:
- `termination_boundary` payload shape
- `CodexReviewError` construction outside the partial-hint decision
- retry eligibility or broader error handling

## Files / Modules

- `scripts/run-review.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Accidentally suppressing partial-output hints for `startup-loop` or other currently expected timeout-adjacent families.
- Broadening the slice into a general `CodexReviewError` transport redesign.

## Validation Plan

- Add focused wrapper regressions for positive and negative boundary families.
- Keep telemetry assertions unchanged aside from the partial-output hint behavior.
- Run the bounded final validation stack on the implementation tree.
