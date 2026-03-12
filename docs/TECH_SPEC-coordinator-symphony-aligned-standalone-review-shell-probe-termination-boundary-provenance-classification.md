---
id: 20260312-1132-coordinator-symphony-aligned-standalone-review-shell-probe-termination-boundary-provenance-classification
title: Coordinator Symphony-Aligned Standalone Review Shell-Probe Termination Boundary Provenance Classification
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-shell-probe-termination-boundary-provenance-classification.md
risk: medium
owners:
  - Codex
last_review: 2026-03-12
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Shell-Probe Termination Boundary Provenance Classification

## Summary

Extend the compact `termination_boundary` contract so the existing shell-probe failure family also emits first-class telemetry/stderr classification without changing any guard behavior.

## Current State

The runtime already exposes a structured shell-probe state in `scripts/lib/review-execution-state.ts`:
- repeated shell-probe detection,
- bounded reason text,
- captured probe sample text,
- dedicated poller-triggered and natural child-close termination handling.

`run-review.ts` already fails closed on that state, but the output contract still differs from the first-class families:
- `termination_boundary` stays `null`,
- stderr prints only the human-readable failure prose,
- downstream automation cannot consume shell-probe as the same compact boundary surface.

## Symphony Alignment Note

The Symphony-aligned move is contract parity, not heuristic broadening. Shell-probe is already a real runtime boundary; `1132` only exposes it through the same stable output shape already used for the supported families and command-intent.

## Proposed Design

### 1. Extend the boundary contract to shell-probe

Add `shell-probe` to the `termination_boundary` kind/provenance contract in `scripts/lib/review-execution-state.ts`.

Use a compact provenance value derived from the existing shell-probe family rather than inventing a wider taxonomy.

The record stays compact:
- `kind`
- `provenance`
- `reason`
- `sample`

### 2. Reuse the existing shell-probe runtime state

`buildTerminationBoundaryRecord(...)` should project the current shell-probe boundary state into the new record.

This slice must not:
- alter shell-probe detection,
- change rejection order,
- change the human-readable failure sentence.

### 3. Carry the record through termination and persistence

`scripts/run-review.ts` should carry the shell-probe boundary record through the same `CodexReviewError` / telemetry path used by the supported families, including both the early child-close branch and the poller-triggered branch.

### 4. Preserve out-of-scope null behavior for the other unsupported families

The new parity is shell-probe only. Active-closeout/self-reference, heavy-command, timeout, stall, and startup-loop families must remain out of the first-class taxonomy for this slice.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `scripts/run-review.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Accidentally widening the taxonomy to active-closeout or other unsupported families.
- Accidentally changing current shell-probe detection or rejection order while plumbing the record.
- Regressing command-intent or the supported `1130` family behavior while broadening the union types.

## Validation Plan

- Add focused execution-state coverage for persisted shell-probe `termination_boundary` records.
- Add wrapper coverage for both poller-triggered and natural child-close shell-probe failures plus negative out-of-scope cases.
- Keep existing human-readable failure substring assertions green.
- Run the docs-first bundle before implementation and the full validation stack on the final tree.
