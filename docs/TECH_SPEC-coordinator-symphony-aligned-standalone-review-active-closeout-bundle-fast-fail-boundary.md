---
id: 20260311-1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary
title: Coordinator Symphony-Aligned Standalone Review Active Closeout Bundle Fast-Fail Boundary
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md
related_tasks:
  - tasks/tasks-1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Active Closeout Bundle Fast-Fail Boundary

## Summary

Make bounded standalone review fail promptly when it starts post-anchor rereads of the active closeout bundle for the task under review, instead of waiting for the generic meta-surface timeout to expire.

## Scope

- Tighten post-anchor active-closeout-bundle reread handling in the standalone review execution state.
- Keep the failure classification and telemetry anchored on `review-closeout-bundle`.
- Add focused regression coverage for the `1118`-style self-inspection path.

## Out of Scope

- Broader verdict-stability or prompt redesign.
- Changes to audit-mode allowed meta surfaces.
- Native review replacement.
- Any reopen of whole-file probe or harness-env slices.

## Proposed Design

### 1. Treat post-anchor active closeout bundle rereads as a dedicated fast-fail shape

`review-closeout-bundle` is already classified in `review-execution-state.ts`, but today it only contributes to the generic meta-surface candidate window. The new boundary should fail sooner when the repeated meta surface is specifically post-anchor rereads of the active closeout bundle for the task under review.

### 2. Keep the logic local to review execution state

The smallest seam is in `scripts/lib/review-execution-state.ts`, where meta-surface samples are summarized and timeout candidates are shaped. That keeps `scripts/run-review.ts` thin and preserves the existing runtime telemetry/reporting plumbing unless a small reason-string or logging adjustment is necessary. `tests/review-execution-state.spec.ts` is the right focused place to assert the reread-shaping logic if an end-to-end-only assertion would be too coarse.

### 3. Add targeted runtime contract coverage

Add focused `tests/run-review.spec.ts` coverage that models a bounded review drifting into post-anchor rereads of the active closeout bundle after initial bounded inspection and verifies that the wrapper exits on the fast-fail path rather than only on the long generic timeout. Add targeted `tests/review-execution-state.spec.ts` coverage for the dedicated reread-shaping contract.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `tests/run-review.spec.ts`
- `tests/review-execution-state.spec.ts`
- `scripts/run-review.ts` only if a small operator-facing reason/logging adjustment is required
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`
- `docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`
- `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`
- `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`
- `docs/findings/1119-standalone-review-active-closeout-bundle-fast-fail-boundary-deliberation.md`
- `tasks/specs/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`
- `tasks/tasks-1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`
- `.agent/task/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`

## Risks

- Over-tightening the boundary could accidentally treat legitimate task-local evidence inspection as a hard failure too early.
- If the fast-fail shape is too specific, close variants of active-closeout self-inspection may still wait out the generic timeout.
- Audit-mode allowances for run manifests and runner logs must remain intact.

## Validation Plan

- `node scripts/delegation-guard.mjs --task 1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npx vitest run tests/review-execution-state.spec.ts -t "active closeout"`
- `npm run test -- tests/run-review.spec.ts`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
