---
id: 20260315-1210-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-review-support-classification
title: Coordinator Symphony-Aligned Standalone Review Shell Env Interpreter Review-Support Classification
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-review-support-classification.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-review-support-classification.md
related_tasks:
  - tasks/tasks-1210-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-review-support-classification.md
review_notes:
  - 2026-03-15: Local read-only scouts approve a narrow support-family classification follow-on after `1209`. The shell-env helper family is missing from the `review-support` classifier and touched-family exemptions in `scripts/lib/review-execution-state.ts:3697-3713` and `scripts/lib/review-execution-state.ts:3801-3824`, making this the next bounded standalone-review seam. Evidence: `docs/findings/1210-standalone-review-shell-env-interpreter-review-support-classification-deliberation.md`, `scripts/lib/review-execution-state.ts`, `scripts/lib/review-shell-env-interpreter.ts`.
---

# Technical Specification

## Context

The standalone-review support-family classifier still points at the older adjacent helper families even though `1209` extracted shell-env interpretation into its own helper module.

## Requirements

1. Classify `scripts/lib/review-shell-env-interpreter.ts` as `review-support`.
2. Classify `dist/scripts/lib/review-shell-env-interpreter.js` as `review-support`.
3. Extend the local touched-family exemption logic so the shell-env helper source and built pair inherit the same bounded diff behavior as the adjacent helper families.
4. Keep the lane local to support-family classification and its focused regressions.
5. Do not widen into shell-env behavior changes, new helper extraction, or `scripts/run-review.ts` runtime supervision.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`
- `npm run review`
- `npm run pack:smoke`
