---
id: 20260310-1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary
title: Coordinator Symphony-Aligned Standalone Review Audit Startup-Surface Boundary
status: draft
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md
related_tasks:
  - tasks/tasks-1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Audit Startup-Surface Boundary

## Summary

Add a bounded audit-mode startup-surface boundary to standalone review so repeated pre-anchor reads of memory, skills, or review docs are rejected unless the reviewer has already established a valid audit startup anchor such as the active evidence manifest or active runner log. Pair that with audit-specific prompt guidance that tells the reviewer to start from the manifest or runner log before broader context surfaces.

## Scope

- Update `scripts/lib/review-execution-state.ts` with audit startup-anchor tracking.
- Update `scripts/run-review.ts` audit prompt guidance and runtime wiring.
- Add focused audit startup coverage in `tests/review-execution-state.spec.ts`.
- Add runtime-facing audit prompt/boundary coverage in `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and task mirrors to reflect the new audit startup contract.

## Out of Scope

- Native review-controller replacement.
- Diff-mode startup-boundary behavior.
- Sustained meta-surface or low-signal heuristic retuning.
- Broader audit evidence-surface redesign.
- Product/controller extraction work.

## Proposed Design

### 1. Audit startup-anchor state

Track audit startup progress separately from diff startup progress. A bounded audit startup anchor is established when the reviewer inspects the active evidence manifest or active runner log for the current review. Repeated off-surface startup reads should only be evaluated before that audit anchor is observed.

### 2. Pre-anchor off-surface budget

Allow at most a tiny incidental startup budget before the first audit anchor. Repeated pre-anchor reads of memory, skills, or review docs should trigger a dedicated audit startup boundary. Mere lack of an anchor should not fail the run by itself.

### 3. Prompt alignment

Add one audit-specific startup instruction:

- Start with the manifest or runner log before consulting memory, skills, or review docs.

Keep the existing audit evidence-surface guidance intact.

### 4. Existing sustained guards stay in place

Do not replace the current sustained meta-surface guard. The new boundary only covers the early audit startup-ordering gap, analogous to `1107` for diff mode.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `scripts/run-review.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- False positives if legitimate audit startup reads are not recognized as anchors.
- Overlapping audit and diff startup logic becoming hard to reason about if the new boundary is not kept narrow.
- Accidentally broadening the slice into general audit-evidence redesign.

## Validation Plan

- Focused unit regressions for audit startup triggering and non-triggering flows.
- Runtime regression proving the audit prompt contains the startup-evidence instruction.
- Preserve existing audit prompt, task-context, and sustained meta-surface coverage.
- Run the docs-first guard bundle before implementation.
