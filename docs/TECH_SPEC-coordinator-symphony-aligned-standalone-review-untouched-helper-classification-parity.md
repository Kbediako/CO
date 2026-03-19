---
id: 20260311-1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity
title: Coordinator Symphony-Aligned Standalone Review Untouched Helper Classification Parity
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity.md
related_tasks:
  - tasks/tasks-1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Untouched Helper Classification Parity

## Summary

Extend bounded standalone review so untouched adjacent review-owned helper files that only support review classification or path handling are treated with the same review-support parity as the existing `run-review` / `review-execution-state` support surfaces.

## Scope

- Update `scripts/lib/review-execution-state.ts` classification for the smallest relevant untouched helper set.
- Add focused coverage in `tests/review-execution-state.spec.ts`.
- Add runtime-facing coverage in `tests/run-review.spec.ts` only where needed to prove touched-helper preservation or bounded review behavior.
- Keep docs/task mirrors aligned.

## Out of Scope

- Another active closeout provenance prompt change after `1112`.
- Broad reclassification of unrelated scripts or historical logs.
- Native review replacement or unrelated Symphony controller extraction work.
- Policy changes for explicit audit evidence surfaces.

## Proposed Design

### 1. Extend review-support parity to the smallest review-owned helper set

Treat untouched reads of the minimal adjacent review-owned helper family still implicated in live review drift as `review-support` meta-surface activity. Current evidence points at:

- `scripts/lib/review-scope-paths.ts`
- `dist/scripts/lib/review-scope-paths.js`
- `tests/review-scope-paths.spec.ts`

Add more files only if the implementation or tests prove they are truly part of the same residual drift class.

### 2. Preserve touched helper diffs

If one of those helper files is in the active diff, review must still be allowed to inspect it as an ordinary touched surface. The parity change is only for untouched helper exploration.

### 3. Keep the change classifier-local

The seam should stay inside `review-execution-state` classification plus the smallest test/doc updates needed to prove the behavior. Do not reopen prompt wording or closeout-root selection logic.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts` (only if runtime-facing proof is needed)
- `docs/standalone-review-guide.md` (only if behavior wording changes materially)

## Risks

- Over-broad helper classification could block legitimate inspection of touched helper diffs.
- Under-broad classification could leave the live drift pattern unchanged and force another near-duplicate follow-on.
- Mixing this seam with broader review-policy redesign would lose the bounded shape established by `1111` and `1112`.

## Validation Plan

- Focused classification regressions in `tests/review-execution-state.spec.ts`.
- Runtime-facing `run-review` coverage only for the final externally visible behavior that proves untouched-helper drift is fenced without blocking touched helper diffs.
- Standard docs-first guards before implementation, then the bounded closeout lane plus manifest-backed review and pack smoke.
