---
id: 20260312-1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification
title: Coordinator Symphony-Aligned Standalone Review Startup-Loop Termination Boundary Classification
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification.md
risk: medium
owners:
  - Codex
last_review: 2026-03-12
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Startup-Loop Termination Boundary Classification

## Summary

Expose the existing startup-loop failure as a first-class `termination_boundary` family without redesigning the detector itself.

## Current State

`scripts/run-review.ts` already has a dedicated startup-loop branch:
- it polls `getStartupLoopState()`
- it terminates only when startup events keep repeating with no review progress
- it emits distinct startup-loop prose

But the compact boundary contract does not recognize that path yet:
- `ReviewTerminationBoundaryKind` / provenance unions do not include startup-loop
- `buildTerminationBoundaryRecord(...)` cannot surface startup-loop
- fallback error inference cannot classify startup-loop prose

## Symphony Alignment Note

The Symphony-aligned move is to surface an already-real deterministic runtime family, not to expand the policy taxonomy. Startup-loop is already more specific than plain timeout/stall, so it deserves explicit contract representation.

## Proposed Design

### 1. Add a first-class startup-loop boundary family

Extend the standalone-review boundary contract in `scripts/lib/review-execution-state.ts` with:
- `kind: startup-loop`
- `provenance: delegation-startup-loop`

### 2. Thread an explicit startup-loop boundary record from `run-review`

Keep the detector in `scripts/run-review.ts` as the source of truth.

At the existing startup-loop termination site, construct/pass an explicit boundary record containing:
- `kind: startup-loop`
- `provenance: delegation-startup-loop`
- the existing human-readable startup-loop reason
- `sample: null`

This keeps the slice bounded and avoids pretending `ReviewExecutionState` already owns the full startup-loop timeout contract.

### 3. Extend fallback error inference

`inferTerminationBoundaryKindsFromErrorMessage(...)` should recognize startup-loop prose so persisted telemetry stays classified even if an explicit boundary record is not threaded in some future path.

### 4. Keep false-positive behavior unchanged

The existing cross-stream fragmented startup-text guard remains authoritative:
- genuine startup-loop cases become first-class
- fragmented cross-stream noise still falls back to plain timeout

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `scripts/run-review.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Accidentally classifying generic timeout/stall paths as startup-loop.
- Reworking `ReviewExecutionState` more than necessary instead of keeping `run-review` as the runtime source of truth.
- Breaking the existing fragmented cross-stream false-positive guard.

## Validation Plan

- Add focused wrapper coverage proving startup-loop now persists first-class boundary telemetry/stderr.
- Preserve existing startup-loop detection expectations.
- Preserve the existing cross-stream fragmented negative case.
- Run docs-first guards before implementation and the bounded final validation stack on the implementation tree.
