---
id: 20260312-1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split
title: Coordinator Symphony-Aligned Standalone Review Active-Closeout Termination Boundary Taxonomy Split
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split.md
risk: medium
owners:
  - Codex
last_review: 2026-03-12
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Active-Closeout Termination Boundary Taxonomy Split

## Summary

Split active-closeout handling into two explicit taxonomic outcomes:
- keep broad self-reference / closeout searching under `meta-surface-expansion`
- promote only the dedicated active-closeout bundle reread guard into a first-class `termination_boundary`

## Current State

The runtime already distinguishes two active-closeout-related behaviors:
- meta-surface expansion when review broadens into active-closeout/self-reference search
- a dedicated `getActiveCloseoutBundleRereadBoundaryState(...)` guard used after startup-anchor / closeout resolution

The dedicated reread guard is deterministic, but today it still stops review with:
- free-form failure prose
- `termination_boundary: null`

That means active-closeout is no longer a pure “unsupported family”; it is a mixed taxonomy where one behavior is already first-class indirectly through meta-surface expansion and the other still lacks first-class representation.

## Symphony Alignment Note

The Symphony-aligned move is to sharpen the runtime contract, not collapse unlike behaviors into one umbrella label. This slice treats active-closeout rereads as a discrete deterministic boundary while leaving broader self-reference search classified under the existing cross-surface meta-surface family.

## Proposed Design

### 1. Add a dedicated active-closeout reread boundary family

Extend the `termination_boundary` kind/provenance unions in `scripts/lib/review-execution-state.ts` with a dedicated active-closeout reread family.

Planned contract:
- `kind: active-closeout-reread`
- compact deterministic provenance for the reread guard only

### 2. Project the existing reread runtime state through that family

`buildTerminationBoundaryRecord(...)` should use the existing `getActiveCloseoutBundleRereadBoundaryState(...)` state to construct the new first-class boundary record.

The record remains compact:
- `kind`
- `provenance`
- `reason`
- `sample`

### 3. Keep active-closeout search under meta-surface expansion

No new umbrella `active-closeout` family is introduced.

Meta-surface expansion due to active-closeout/self-reference searching must remain classified exactly as it is today. The slice only promotes the dedicated reread guard.

### 4. Carry the record through run-review termination and persistence

`scripts/run-review.ts` should pass the explicit reread boundary record through the same `CodexReviewError` / telemetry / stderr classification path used by the first-class families.

### 5. Update docs and tests to make the split explicit

Docs should state that:
- active-closeout search remains meta-surface expansion
- active-closeout reread is now first-class

Tests should cover:
- reread guard emits first-class boundary record
- active-closeout search remains meta-surface expansion
- out-of-scope families remain unchanged

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `scripts/run-review.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Accidentally collapsing active-closeout search and reread into one too-broad family.
- Regressing existing meta-surface-expansion behavior while plumbing reread parity.
- Widening this slice into timeout / stall / heavy-command taxonomy work.

## Validation Plan

- Add focused execution-state coverage for the dedicated active-closeout reread boundary record.
- Add wrapper coverage proving reread failures are first-class while search failures remain meta-surface expansion.
- Keep existing human-readable failure substring assertions green.
- Run docs-first guards before implementation and the full validation stack on the final tree.
