---
id: 20260312-1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split
title: Coordinator Symphony-Aligned Standalone Review Timeout-Stall Termination Boundary Taxonomy Split
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split.md
risk: medium
owners:
  - Codex
last_review: 2026-03-12
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Timeout-Stall Termination Boundary Taxonomy Split

## Summary

Expose the existing generic timeout and output-stall failures as first-class `termination_boundary` families without redesigning the surrounding timeout machinery.

## Current State

`scripts/run-review.ts` already has explicit timeout and stall branches:
- the overall timeout branch terminates when the configured wall clock cap is exceeded
- the stall branch terminates when no output arrives for the configured stall window
- both already emit distinct prose

But the compact boundary contract does not recognize those paths yet:
- `ReviewTerminationBoundaryKind` / provenance unions do not include timeout or stall
- `requestTermination(...)` does not pass explicit records for those branches
- fallback error inference cannot classify timeout/stall prose

## Symphony Alignment Note

The Symphony-aligned move is to surface already-real deterministic runtime families, not to redesign generic failure policy. Timeout and stall are explicit runtime branches already, so they deserve compact contract representation once startup-loop is no longer sharing that generic bucket.

## Proposed Design

### 1. Add first-class timeout and stall boundary families

Extend the standalone-review boundary contract in `scripts/lib/review-execution-state.ts` with:
- `kind: timeout`
- `kind: stall`
- provenance values:
  - `review-timeout`
  - `output-stall`

### 2. Thread explicit boundary records from `run-review`

Keep `scripts/run-review.ts` as the runtime source of truth.

At the existing timeout and stall termination sites, construct/pass explicit boundary records containing:
- the family `kind`
- the stable provenance
- the existing human-readable reason
- `sample: null`

### 3. Extend fallback error inference

`inferTerminationBoundaryKindsFromErrorMessage(...)` should recognize the existing timeout/stall prose so persisted telemetry stays classified even if some future path omits the explicit record.

### 4. Preserve existing retry/error semantics

The slice must not broaden into changing the current `timedOut` handling or startup-loop behavior unless the narrow boundary-classification work requires a small compatibility fix.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `scripts/run-review.ts`
- `tests/run-review.spec.ts`
- `tests/review-execution-state.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Accidentally collapsing startup-loop back into generic timeout classification.
- Overreaching into `timedOut` retry semantics instead of staying on classification/provenance.
- Broadening into umbrella "all remaining boundary families" work.

## Validation Plan

- Add focused wrapper coverage proving timeout/stall now persist first-class boundary telemetry/stderr.
- Preserve existing startup-loop and other boundary-family expectations.
- Run docs-first guards before implementation and the bounded final validation stack on the implementation tree.
