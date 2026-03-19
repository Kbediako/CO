---
id: 20260311-1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary
title: Coordinator Symphony-Aligned Standalone Review Closeout-Bundle Self-Reference Boundary
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md
related_tasks:
  - tasks/tasks-1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Closeout-Bundle Self-Reference Boundary

## Summary

Extend bounded standalone review so the current task’s active closeout bundle is classified as a self-referential review surface in diff mode, preventing rereads of `09-review.log`, `00-summary.md`, `13-override-notes.md`, `14-next-slice-note.md`, and similar current-bundle artifacts from reopening another low-signal loop.

## Scope

- Update `scripts/lib/review-execution-state.ts` classification so active closeout-bundle artifact paths count as a bounded self-referential surface.
- Cover both direct file reads and repo-wide searches that surface the active closeout bundle.
- Add focused coverage in `tests/review-execution-state.spec.ts` and `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and task mirrors.

## Out of Scope

- Direct shell-probe parity beyond `1110`.
- General review-artifact policy redesign.
- Native review replacement or prompt redesign.
- Unrelated Symphony controller work.

## Proposed Design

### 1. Recognize the active closeout bundle as self-referential

Treat paths under the current task’s `out/<task>/manual/*-closeout/` bundle as a bounded self-reference surface when the review surface is `diff`.

### 2. Catch both direct reads and search-driven surfacing

The classifier should trigger not only on direct `sed/cat/tail/... out/.../09-review.log` reads, but also on repo-wide search commands whose operands surface those active closeout-bundle paths.

### 3. Preserve legitimate evidence surfaces

Do not regress the explicit startup-anchor and audit allowances for the active manifest or active runner log, and do not treat ordinary touched-file code reads as closeout-bundle self-reference.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Over-broad closeout-bundle matching could classify historical archived artifacts that are not part of the current review loop.
- Under-broad matching would leave the current `09-review.log` reread loop intact.
- If this slice is mixed with wider meta-surface policy work, it will lose the bounded shape that `1110` identified.

## Validation Plan

- Focused state regressions for direct active-closeout reads and search-driven active-closeout matches.
- Wrapper-facing regressions proving bounded diff review terminates when the current closeout bundle is reread.
- Docs-first guards before implementation, then the bounded validation lane plus review/pack smoke at closeout.
