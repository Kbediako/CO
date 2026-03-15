---
id: 20260315-1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction
title: Coordinator Symphony-Aligned Standalone Review Command-Probe Classification Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md
related_tasks:
  - tasks/tasks-1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md
review_notes:
  - 2026-03-15: Local read-only reassessment after `1213` approves a narrow inspection-target parsing extraction. The remaining truthful seam is the deterministic shell-probe and heavy-command classifier cluster reused by review command-line prefiltering inside `scripts/lib/review-execution-state.ts`. Evidence: `docs/findings/1214-standalone-review-command-probe-classification-extraction-deliberation.md`, `scripts/lib/review-execution-state.ts`.
---

# Technical Specification

## Context

The standalone-review execution-state file still contains a deterministic shell-probe and heavy-command classifier cluster that is reused by review command-line analysis but not yet owned by its own helper boundary.

## Requirements

1. Extract the shared shell-probe and heavy-command classifier seam from `scripts/lib/review-execution-state.ts`.
2. Preserve nested payload probe detection, `grep` option parsing, shell-probe env-var heuristics, and heavy-command detection behavior for existing consumers.
3. Keep the lane local to `review-execution-state` plus focused classifier regressions.
4. Do not widen into command-intent, meta-surface, startup-anchor, stateful review-boundary handling, or `run-review` runtime work.
5. Record review-reliability issues separately unless the classifier extraction directly depends on them.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts`
- `npm run review`
- `npm run pack:smoke`
