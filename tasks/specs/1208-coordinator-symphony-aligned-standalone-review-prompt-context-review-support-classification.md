---
id: 20260315-1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification
title: Coordinator Symphony-Aligned Standalone Review Prompt Context Review-Support Classification
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md
related_tasks:
  - tasks/tasks-1208-coordinator-symphony-aligned-standalone-review-prompt-context-review-support-classification.md
review_notes:
  - 2026-03-15: Local read-only scout approves a narrow support-family classification follow-on after `1207`. The prompt-context helper and direct spec are missing from the `review-support` classifier in `scripts/lib/review-execution-state.ts:4065-4085`, making this the next bounded standalone-review seam. Evidence: `docs/findings/1208-standalone-review-prompt-context-review-support-classification-deliberation.md`, `scripts/lib/review-execution-state.ts`, `scripts/lib/review-prompt-context.ts`, `tests/review-prompt-context.spec.ts`.
---

# Technical Specification

## Context

The standalone-review support-family classifier still points at the older adjacent helper families, even though `1207` extracted prompt/context support into its own helper and direct spec.

## Requirements

1. Classify `scripts/lib/review-prompt-context.ts` as `review-support`.
2. Classify `dist/scripts/lib/review-prompt-context.js` as `review-support`.
3. Classify the direct focused prompt-context spec as `review-support`.
4. Keep the lane local to support-family classification and its focused regressions.
5. Do not widen into prompt behavior, review runtime, telemetry, or further helper extraction.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`
- `npm run review`
- `npm run pack:smoke`
