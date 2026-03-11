---
id: 20260311-1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness
title: Coordinator Symphony-Aligned Standalone Review Run-Review Spec Whole-File Probe Truthfulness
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md
related_tasks:
  - tasks/tasks-1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Run-Review Spec Whole-File Probe Truthfulness

## Summary

Correct the stale “whole-file determinism residual” claim around `tests/run-review.spec.ts` by recording reporter-aware terminal evidence and updating task/docs mirrors, without reopening harness or product code.

## Scope

- Replace stale determinism claims in the `1117` closeout narrative and the active `1118` docs-first registration.
- Record the canonical whole-file probe commands and results for both default and verbose reporters.
- Keep docs/task mirrors aligned with the corrected validation-truthfulness scope.

## Out of Scope

- Code changes in `tests/run-review.spec.ts`.
- Product-runtime changes in `scripts/run-review.ts` or `scripts/lib/review-execution-state.ts`.
- Tail-splitting or helper extraction work.
- Native review replacement, wrapper redesign, or broader prompt-surface changes.

## Proposed Design

### 1. Treat the old startup-banner-only probe as non-diagnostic

The `1117` whole-file probe only captured the default Vitest startup banner before the bounded observation window ended. Fresh current-tree reruns show that the file terminates successfully under both the default and verbose reporters. The corrected slice should explicitly record that the old probe was insufficient evidence for a monolithic determinism defect.

### 2. Record canonical reporter-aware validation evidence

Record the current successful commands and results in the closeout artifacts and task/docs mirrors:

- `npx vitest run tests/run-review.spec.ts`
- `npx vitest run tests/run-review.spec.ts --reporter=verbose`

The verbose run is the most operator-friendly canonical proof because it exposes ongoing progress during the long file-level run. The default reporter run is still useful to show that quiet output alone does not imply a hang.

### 3. Keep product and harness code out of scope

Because the new evidence shows the monolithic spec already terminates, the next truthful slice is a docs/evidence correction lane. Any future shell-probe / command-intent tail split should be deferred until new evidence shows a real need.

## Files / Modules

- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`
- `docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`
- `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`
- `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`
- `docs/findings/1118-standalone-review-run-review-spec-whole-file-probe-truthfulness-deliberation.md`
- `tasks/specs/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`
- `tasks/tasks-1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`
- `.agent/task/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md`

## Risks

- If the documentation is not corrected now, the repo will continue steering future work toward a stale defect theory.
- Quiet default-reporter output could still be mistaken for a hang by future operators unless the current evidence is made explicit.
- This slice should not over-correct by rewriting older closeouts beyond what is necessary to supersede stale claims going forward.

## Validation Plan

- Run `npx vitest run tests/run-review.spec.ts`.
- Run `npx vitest run tests/run-review.spec.ts --reporter=verbose`.
- Run `npm run test` to verify the earlier quiet-tail assumption is also stale on the current tree.
- Run docs guards on the corrected task/docs mirrors.
