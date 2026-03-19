---
id: 20260315-1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction
title: Coordinator Symphony-Aligned Standalone Review Shell Command Parser Primitives Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md
related_tasks:
  - tasks/tasks-1211-coordinator-symphony-aligned-standalone-review-shell-command-parser-primitives-extraction.md
review_notes:
  - 2026-03-15: Local read-only reassessment plus bounded scout approval confirm a real parser-family seam after `1210`. The remaining truthful next slice is the shared shell-command parser cluster reused across heavy-command, shell-probe, command-intent, meta-surface, startup-anchor, and inspection-target analysis inside `scripts/lib/review-execution-state.ts`. Evidence: `docs/findings/1211-standalone-review-shell-command-parser-primitives-extraction-deliberation.md`, `scripts/lib/review-execution-state.ts`.
---

# Technical Specification

## Context

The standalone-review execution-state file still contains a shared shell-command parser cluster that is reused by multiple analyses but not yet owned by its own helper boundary.

## Requirements

1. Extract the shared shell-command parser primitives from `scripts/lib/review-execution-state.ts`.
2. Preserve current shell-control segmentation, token normalization, env-assignment stripping, `env` unwrap handling, shell truthiness inference, and shell-command payload extraction semantics for existing consumers.
3. Keep the lane local to `review-execution-state` plus focused parser regressions.
4. Do not widen into command-intent, shell-probe, meta-surface, startup-anchor, or heavy-command policy changes.
5. Record any review-reliability issues separately unless the parser extraction directly depends on them.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`
- `npm run review`
- `npm run pack:smoke`
