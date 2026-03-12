---
id: 20260312-1129-coordinator-symphony-aligned-standalone-review-architecture-in-bounds-verdict-termination-boundary
title: Coordinator Symphony-Aligned Standalone Review Architecture In-Bounds Verdict Termination Boundary
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-architecture-in-bounds-verdict-termination-boundary.md
risk: medium
owners:
  - Codex
last_review: 2026-03-12
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Architecture In-Bounds Verdict Termination Boundary

## Summary

Tighten standalone-review termination so the `architecture` surface does not remain in a long in-bounds reread loop until the global timeout fires. Reuse the existing review-runtime boundary primitives instead of adding a new surface or replacing the wrapper.

## Current State

`1128` left the wrapper in a materially better place:
- `architecture` is an explicit third review surface.
- canonical task docs are modeled as `architecture-context`.
- prompt-plus-scope rejection is handled by wrapper fallback on Codex CLI `0.114.0`.

The remaining live failure mode is now:
1. review stays on canonical architecture docs plus touched code/tests,
2. no heavy-command or meta-surface guard triggers,
3. no verdict is emitted,
4. wrapper timeout fires.

Relevant existing hooks:
- `scripts/run-review.ts`
  - architecture prompt/runtime wiring,
  - verdict-stability and relevant-reinspection dwell configuration,
  - monitor/timeout handling.
- `scripts/lib/review-execution-state.ts`
  - candidate tracking for verdict stability,
  - candidate tracking for relevant reinspection dwell,
  - inspection-target extraction and clustering.

## Symphony Alignment Note

The correct Symphony-aligned move is to tighten an existing explicit runtime capability boundary, not to add another informal heuristic or broaden the surface again. The runtime should treat “repetitive in-bounds no-verdict rereads” as its own explicit termination condition.

## Proposed Design

### 1. Extend the in-bounds reread boundary to architecture review

Use the existing relevant-reinspection dwell and/or verdict-stability path for `architecture` review, rather than leaving that protection diff-only or effectively dormant for architecture-mode rereads.

The goal is not “terminate architecture review quickly.” The goal is:
- allow legitimate architecture context gathering,
- terminate when the review repeatedly rereads the same canonical architecture docs and touched implementation targets without moving toward a verdict.

### 2. Keep the boundary target-based

The runtime should keep using the current inspection-target model instead of introducing a new freeform prompt heuristic.

If needed, tighten how architecture-doc rereads and touched-file rereads are clustered so the existing runtime can recognize a no-progress loop earlier.

### 3. Preserve current surface roles

- `diff` remains bounded touched-path review.
- `audit` remains evidence/closeout review.
- `architecture` remains the broader design/context review surface.

This slice only changes how long the runtime tolerates repetitive in-bounds rereads with no verdict.

## Files / Modules

- `scripts/run-review.ts`
- `scripts/lib/review-execution-state.ts`
- `tests/run-review.spec.ts`
- `tests/review-execution-state.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Reusing the wrong boundary could over-tighten architecture review and terminate legitimate first-pass context gathering.
- Over-generalizing the fix could accidentally change `diff` or `audit` behavior.
- If target clustering stays too coarse, the boundary will still miss the no-progress loop and merely rebrand the same timeout.

## Validation Plan

- Add focused execution-state coverage for the architecture-mode reread candidate path.
- Add focused wrapper coverage that reproduces the in-bounds architecture timeout pattern and proves the earlier deterministic boundary.
- Keep the existing `1128` architecture surface contract tests green.
- Run the standard docs-first guard bundle before implementation.
