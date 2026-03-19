---
id: 20260312-1130-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification
title: Coordinator Symphony-Aligned Standalone Review Termination Boundary Provenance Classification
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification.md
risk: medium
owners:
  - Codex
last_review: 2026-03-12
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Termination Boundary Provenance Classification

## Summary

Add a compact first-class termination-boundary record for the existing bounded runtime classes so failed standalone-review runs emit stable telemetry/output classification without changing any guard behavior.

## Current State

The runtime already exposes structured boundary getters in `scripts/lib/review-execution-state.ts` for:
- `getStartupAnchorBoundaryState(...)`
- `getMetaSurfaceExpansionState(...)`
- `getVerdictStabilityState(...)`
- `getRelevantReinspectionDwellBoundaryState(...)`

`run-review` also already uses those states to fail closed. The gap is output shape:
- persisted telemetry only includes `status`, `error`, `output_log_path`, and `summary`,
- stderr prints summary counters and then the raw failure message,
- there is no stable boundary `kind` / provenance record for automation or operators.

## Symphony Alignment Note

The Symphony-aligned move is to surface the existing explicit runtime boundary as first-class output, not to broaden heuristics. The boundary is already real; this slice makes its classification explicit and durable.

## Proposed Design

### 1. Add a compact termination-boundary record in review execution state

Add a new shared record type in `scripts/lib/review-execution-state.ts` for the four in-scope termination classes:
- `startup-anchor`
- `meta-surface-expansion`
- `verdict-stability`
- `relevant-reinspection-dwell`

The record should stay compact and stable:
- `kind`
- `provenance`
- `reason`
- optional sample/detail fields only when already available from existing state

Keep provenance small and deterministic, for example:
- startup-anchor -> `pre-anchor-meta-surface`
- meta-surface-expansion -> `meta-surface-kinds`
- verdict-stability -> `repeated-output-inspection` or `targetless-speculative-narrative`
- relevant-reinspection-dwell -> `post-startup-anchor` or `bounded-surface`

### 2. Persist the record in telemetry

Extend the persisted review telemetry payload with:
- `termination_boundary: <record|null>`

The summary block remains unchanged apart from existing counters.

### 3. Print one stable boundary line in stderr

Extend `logReviewTelemetrySummary(...)` so failed runs with an in-scope record print one explicit classification line before the final thrown failure message, for example:
- `[run-review] termination boundary: relevant-reinspection-dwell (bounded-surface).`

Keep the existing human-readable failure message untouched.

### 4. Keep wrapper selection aligned with existing rejection order

`run-review.ts` should continue to respect the current failure ordering. This slice should only expose the class that actually fired; it must not change which boundary wins.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `scripts/run-review.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Accidentally broadening the slice into a full failure-taxonomy rewrite.
- Accidentally changing the current rejection order while plumbing the new record.
- Breaking tests that currently anchor on the existing human-readable failure prose.

## Validation Plan

- Add focused execution-state coverage for persisted `termination_boundary` records.
- Add wrapper coverage for startup-anchor, meta-surface expansion, verdict-stability, and relevant-reinspection dwell terminal output + telemetry.
- Keep the existing human-readable failure substring assertions green.
- Run the standard docs-first bundle before implementation and the full validation stack on the final tree.
