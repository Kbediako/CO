---
id: 20260311-1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary
title: Coordinator Symphony-Aligned Standalone Review Generic Speculative Dwell Boundary
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md
related_tasks:
  - tasks/tasks-1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Generic Speculative Dwell Boundary

## Summary

Add a bounded generic-speculative-dwell detector so standalone review exits explicitly when the reviewer keeps hypothesizing without introducing new concrete diff-local findings.

## Scope

- Extend `scripts/lib/review-execution-state.ts` with a detector for repeated non-concrete speculative dwell that is broader than the file-targeted `1114` guard.
- Add focused coverage in `tests/review-execution-state.spec.ts` and `tests/run-review.spec.ts`.
- Touch `scripts/run-review.ts` only if surfaced wording or termination plumbing must change after the state-layer detector is added.
- Update `docs/standalone-review-guide.md` and keep docs/task mirrors aligned.

## Out of Scope

- Reopening the touched-fixture false-positive case from `1114`.
- Native review replacement.
- Broad prompt-only reviewer guidance rewrites.
- Other standalone-review helper-family or meta-surface semantics changes.

## Proposed Design

### 1. Add a broader generic speculative dwell detector

Introduce a detector inside `ReviewExecutionState` for repeated speculative output that does not need explicit file targets. The new boundary should still require enough sustained review activity to distinguish real drift from short reconsideration.

The detector should key off execution-state evidence, not just language shape:

- repeated speculative narrative signatures,
- lack of new concrete finding or diff-local evidence signals,
- continued review activity (`thinking`, command starts, output),
- bounded recent windows so stale speculative bursts age out.

### 2. Preserve legitimate small-diff revisits

The detector must not treat every revisit to a 1-4 file diff as drift. If the reviewer keeps introducing concrete findings, actionable evidence, or otherwise meaningful diff-local progress, the boundary should stay disarmed even when the same files are revisited.

### 3. Keep `1114` behavior intact

The new boundary should compose with `1114`, not replace it blindly:

- `1114` continues covering repeated file-targeted speculative dwell,
- the new boundary covers broader conceptual hypothesis loops after file-targeted drift is already handled,
- existing low-signal and meta-surface boundaries retain their current meanings.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`
- `scripts/run-review.ts` (only if surfaced wording / termination plumbing must change)

## Risks

- If the detector is too aggressive, it could block legitimate careful reviews on small diffs.
- If it depends too heavily on phrase matching again, it will remain brittle and hard to generalize.
- If it overlaps too much with `1114`, the combined boundaries will be difficult to reason about and debug.

## Validation Plan

- Add a state-level test modeled on the captured generic speculative loop from the `1114` final-tree review trace.
- Add negative tests that preserve legitimate same-small-diff revisits when they keep surfacing new concrete findings.
- Add runtime-facing coverage that proves explicit termination on generic speculative dwell without disturbing the existing `1114` cases.
- Rerun the docs-first guard bundle before implementation.
