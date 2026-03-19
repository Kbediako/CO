---
id: 20260312-1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary
title: Coordinator Symphony-Aligned Standalone Review Architecture Surface Boundary
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md
related_tasks:
  - tasks/tasks-1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Architecture Surface Boundary

## Summary

Add an explicit `architecture` review surface to `scripts/run-review.ts` so broader design/context review has a first-class contract instead of leaking into bounded `diff` review. Keep `diff` and `audit` distinct, and tighten startup-anchor handling so `git show <rev>:<path>` is no longer treated as a default diff startup anchor.

## Current State

The review wrapper currently models two surfaces:

1. `diff`
   - bounded touched-path review,
   - startup-anchor enforcement based on touched files,
   - low-signal and meta-surface protections.
2. `audit`
   - manifest/log/checklist/evidence review,
   - audit-specific startup-anchor and allowed meta-surface rules.

This has materially improved reliability, but it still leaves broader architectural inspection implicit. When the reviewer wants to understand wider design shape, it currently does that from inside the `diff` lane, which is where the remaining adjacent-helper and historical-context drift comes from.

## Symphony Alignment Note

Symphony keeps capabilities explicit and decomposed rather than overloading one control path with multiple intents. CO should mirror that shape here by treating architecture review as its own explicit surface instead of letting it emerge accidentally from bounded diff review.

## Proposed Design

### 1. Add an explicit `architecture` review surface

Extend review-surface selection so the wrapper supports:
- `diff`
- `audit`
- `architecture`

`architecture` should be a first-class prompt/runtime surface, not a prompt-only convention.

Its canonical prompt inputs should be:
- the task checklist,
- primary PRD,
- TECH_SPEC,
- ACTION_PLAN,
- `.agent/system/architecture.md`.

### 2. Preserve current contracts for `diff` and `audit`

- `diff` remains the default bounded touched-path review surface.
- `audit` remains the evidence/closeout surface.
- `architecture` is broader than `diff`, but still explicit and intentional rather than unbounded drift.

### 3. Refine startup-anchor behavior for diff review

Revise the startup-anchor contract so `git show <rev>:<path>` does not count as an ordinary diff startup anchor. That form is useful for broader inspection, but it should not prematurely satisfy bounded diff anchoring.

Do not introduce a third startup-anchor mode in this slice. `architecture` should stay prompt/allowlist-scoped in v1 while the runtime keeps the existing `diff|audit` startup model.

### 4. Add a narrow architecture allowlist

Permit `architecture` runs to inspect the wrapper/docs support surfaces needed for intentional architecture review:
- `review-support`
- `review-docs`

Preserve current behavior elsewhere:
- `diff` continues to treat those reads as off-task meta surfaces,
- `audit` keeps its evidence-focused allowlist.

### 5. Keep runtime authority centralized

Preserve the current split:
- `ReviewExecutionState` stays the authority for runtime classification/boundary state.
- `scripts/run-review.ts` stays a thin launcher/prompt/runtime wiring shell.

## Files / Modules

- `scripts/run-review.ts`
- `scripts/lib/review-execution-state.ts`
- `tests/run-review.spec.ts`
- `tests/review-execution-state.spec.ts`
- `docs/standalone-review-guide.md`
- `.agent/system/architecture.md`
- `bin/codex-orchestrator.ts`

## Risks

- Accidentally weakening `diff` safeguards while adding the new surface.
- Letting `architecture` become a generic escape hatch instead of an explicit mode.
- Over-scoping the slice into a native review replacement or unrelated parser work.

## Validation Plan

- Add focused prompt-contract coverage for `--surface architecture`.
- Add focused runtime-state coverage for:
  - the revised diff startup-anchor behavior,
  - the narrow `architecture` allowlist.
- Keep existing bounded `audit` and structured-scope regressions green.
- Run the docs-first guard bundle before implementation.
