---
id: 20260312-1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification
title: Coordinator Symphony-Aligned Standalone Review Command-Intent Termination Boundary Provenance Classification
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md
risk: medium
owners:
  - Codex
last_review: 2026-03-12
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Command-Intent Termination Boundary Provenance Classification

## Summary

Extend the compact `termination_boundary` contract introduced by `1130` so the existing command-intent failure family also emits first-class telemetry/stderr classification without changing any guard behavior.

## Current State

The runtime already exposes a structured command-intent state in `scripts/lib/review-execution-state.ts`:
- `getCommandIntentBoundaryState(...)`
- typed `violationKind`
- captured `violationSample`

`run-review.ts` already fails closed on that state, but the output contract still differs from the four `1130` families:
- `termination_boundary` stays `null`,
- stderr prints only the human-readable failure prose,
- downstream automation cannot consume command-intent as the same first-class boundary surface.

## Symphony Alignment Note

The Symphony-aligned move is still contract parity, not heuristic broadening. Command-intent is already a real runtime boundary; `1131` only exposes it through the same stable output shape already used for the four `1130` families.

## Proposed Design

### 1. Extend the boundary contract to command-intent

Add `command-intent` to the `termination_boundary` kind/provenance contract in `scripts/lib/review-execution-state.ts`.

Use the existing command-intent subkind as the provenance source:
- `validation-suite`
- `validation-runner`
- `review-orchestration`
- `delegation-control`

The record stays compact:
- `kind`
- `provenance`
- `reason`
- `sample`

### 2. Reuse the existing command-intent boundary state

`buildTerminationBoundaryRecord(...)` should project the current `getCommandIntentBoundaryState(...)` result into the new record.

This slice must not:
- alter command-intent detection,
- change rejection order,
- change the human-readable failure sentence.

### 3. Carry the record through termination and persistence

`scripts/run-review.ts` should carry the command-intent boundary record through the same `CodexReviewError` / telemetry path used by the supported `1130` families, including the early child-close branch and the poller-triggered branch.

### 4. Preserve out-of-scope null behavior for the other families

The new parity is command-intent only. Shell-probe, active-closeout/self-reference, heavy-command, timeout, stall, and startup-loop families must remain out of the first-class taxonomy for this slice.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `scripts/run-review.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Accidentally widening the taxonomy to additional out-of-scope failure families.
- Accidentally changing the current command-intent rejection order while plumbing the record.
- Breaking the redaction/null behavior added in `1130`.

## Validation Plan

- Add focused execution-state coverage for persisted command-intent `termination_boundary` records.
- Add wrapper coverage for all four command-intent subkinds plus negative out-of-scope cases.
- Keep existing human-readable failure substring assertions green.
- Run the docs-first bundle before implementation and the full validation stack on the final tree.
