---
id: 20260315-1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction
title: Coordinator Symphony-Aligned Standalone Review Shell Env Interpreter Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md
related_tasks:
  - tasks/tasks-1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md
review_notes:
  - 2026-03-15: Local read-only scout approves a narrow shell-env interpreter extraction after `1208`. The remaining truthful seam is the shared exported-env / nested-shell / `env` / `export` / `unset` interpreter reused across `scripts/lib/review-execution-state.ts:2593`, `scripts/lib/review-execution-state.ts:2696`, `scripts/lib/review-execution-state.ts:2790`, and `scripts/lib/review-execution-state.ts:3412`. Evidence: `docs/findings/1209-standalone-review-shell-env-interpreter-extraction-deliberation.md`, `scripts/lib/review-execution-state.ts`.
---

# Technical Specification

## Context

The standalone-review execution-state file still contains a shared shell-env interpreter state machine that is reused by multiple analyses but not yet owned by its own helper boundary.

## Requirements

1. Extract the shared shell-env interpreter seam from `scripts/lib/review-execution-state.ts`.
2. Preserve the current exported-env / nested-shell / `env` / `export` / `unset` semantics for the existing consumers.
3. Keep the lane local to `review-execution-state` plus focused regressions.
4. Do not widen into `scripts/run-review.ts` runtime supervision or unrelated review-taxonomy changes.
5. Record any review-reliability issues separately unless the extraction directly depends on them.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts`
- `npm run review`
- `npm run pack:smoke`
