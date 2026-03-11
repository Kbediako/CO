---
id: 20260311-1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary
title: Coordinator Symphony-Aligned Standalone Review Diff-Local Concrete Progress Evidence Boundary
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md
related_tasks:
  - tasks/tasks-1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Diff-Local Concrete Progress Evidence Boundary

## Summary

Tighten standalone review so concrete-progress validation stays diff-local and does not widen into repo-wide citation/pattern hunts after `1115`.

## Scope

- Tighten the bounded diff-review prompt contract in `scripts/run-review.ts` so citation-style touched-path findings with explicit locations are stated as sufficient concrete same-diff progress.
- Add focused runtime coverage in `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and keep docs/task mirrors aligned.

## Out of Scope

- Reopening `1115` generic targetless speculative-dwell classification.
- Changing `scripts/lib/review-execution-state.ts` concrete-progress classification unless new evidence proves the existing contract is insufficient.
- Historical closeout/task/evidence self-reference handling.
- Native review replacement.
- Broad reviewer prompt redesign beyond the concrete-progress evidence seam.

## Proposed Design

### 1. Make the concrete-progress citation contract explicit in the prompt

The `1115` state layer already accepts citation-style touched-path findings with explicit locations as concrete same-diff progress. The live timeout indicates the reviewer does not reliably know that from the prompt alone.

The bounded diff-review prompt should therefore state explicitly:

- concrete same-diff progress can be shown by citing touched paths with explicit locations,
- accepted shapes include `path:line`, `path:line:col`, `path#Lline`, and `path#LlineCcol`,
- repo-wide hunts for examples of that rendering are unnecessary.

### 2. Preserve truthful same-diff concrete findings

The prompt change must reinforce the existing `1115` contract rather than reinterpret it. Legitimate touched-path citations with explicit locations still count as concrete progress; raw touched-file literals without locations still do not.

### 3. Keep the slice prompt-first

This slice should stay minimal:

- prefer prompt shaping in `scripts/run-review.ts`,
- keep `scripts/lib/review-execution-state.ts` unchanged unless the prompt-only fix proves insufficient,
- add runtime tests that pin the saved prompt contract and the bounded diff-local behavior.

## Files / Modules

- `scripts/run-review.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- A prompt-only fix may not be sufficient if the reviewer keeps widening into repo-wide pattern hunts.
- Over-specifying the citation contract could drift from the current `1115` state behavior if the wording is not kept aligned.
- Runtime tests must stay bounded and avoid depending on the full external reviewer.

## Validation Plan

- Add a runtime/prompt regression that asserts the saved bounded diff-review prompt contains the explicit citation contract and the instruction not to search the repo for examples.
- Add a runtime-facing coverage case showing the bounded review can stay diff-local on the citation-contract seam rather than reproducing the `1115` timeout path.
- Preserve the existing `1115` state-level regressions unchanged.
- Rerun the docs-first guard bundle before implementation.
