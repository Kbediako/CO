---
id: 20260311-1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard
title: Coordinator Symphony-Aligned Standalone Review Verdict Stability Guard
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md
related_tasks:
  - tasks/tasks-1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Verdict Stability Guard

## Summary

Add a bounded verdict-stability guard so standalone review exits explicitly when verbose speculative drift keeps repeating without introducing new diff-relevant progress signals.

## Scope

- Extend `scripts/lib/review-execution-state.ts` with a small no-progress / verdict-stability signal detector.
- Wire the new boundary into `scripts/run-review.ts` next to the existing low-signal/meta-surface/startup-anchor/command-intent/shell-probe guards.
- Add focused runtime-facing coverage in `tests/run-review.spec.ts` and state-level coverage in `tests/review-execution-state.spec.ts`.
- Update `docs/standalone-review-guide.md` and keep docs/task mirrors aligned.

## Out of Scope

- Another helper-family classification change after `1113`.
- Broad replacement of the standalone-review wrapper with a native review runtime.
- Prompt-only wording tweaks without a runtime stop-condition change.
- Reopening broader Symphony controller extraction work.

## Proposed Design

### 1. Add a verdict-stability / no-progress detector

Introduce a bounded detector inside `ReviewExecutionState` that tracks when output remains active but the review stops introducing new diff-relevant inspection novelty. Reuse existing captured primitives where possible:

- repeated inspection targets,
- repeated inspection signatures,
- command starts,
- review progress signals,
- recent command/output windows.

The detector should only arm when there is enough sustained review activity to distinguish real drift from short local reconsideration.

### 2. Keep the guard separate from existing low-signal and meta-surface checks

This slice should not dilute the meaning of existing boundaries:

- low-signal drift still covers repetitive bounded activity broadly,
- meta-surface expansion still covers off-task review surfaces,
- verdict stability should cover repeated speculative or no-convergence behavior that remains inside ostensibly in-scope surfaces but stops producing new concrete progress.

### 3. Terminate explicitly in `run-review.ts`

Add the new boundary to the existing wait-loop termination checks so the wrapper exits with a clear error reason and telemetry summary once verdict stability is violated.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `scripts/run-review.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- If the detector is too aggressive, it could terminate legitimate deep reviews that are still making progress.
- If it overlaps too much with low-signal drift, the boundary will be noisy and hard to reason about.
- If it keys off prompt wording instead of execution-state evidence, it will be brittle across Codex output variations.

## Validation Plan

- Add state-level tests that prove the detector arms only when novelty stalls despite continued activity.
- Add runtime-facing wrapper tests that prove explicit termination on speculative dwell and non-termination when new concrete signals continue appearing.
- Rerun the standard docs-first and closeout validation bundle, including pack smoke.
