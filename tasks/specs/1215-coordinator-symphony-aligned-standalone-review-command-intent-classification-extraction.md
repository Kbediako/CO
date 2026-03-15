---
id: 20260315-1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction
title: Coordinator Symphony-Aligned Standalone Review Command-Intent Classification Extraction
status: completed
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md
related_tasks:
  - tasks/tasks-1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction.md
review_notes:
  - 2026-03-15: Local read-only reassessment after `1214` confirms the next truthful standalone-review seam is the deterministic command-intent classifier cluster still local to `scripts/lib/review-execution-state.ts`. Evidence: `docs/findings/1215-standalone-review-command-intent-classification-extraction-deliberation.md`, `scripts/lib/review-execution-state.ts`.
  - 2026-03-15: Closeout completed. The helper family now lives in `scripts/lib/review-command-intent-classification.ts`, helper-family `review-support` parity was preserved in `scripts/lib/review-meta-surface-normalization.ts`, focused regressions were green, and the only explicit non-green items were the recurring full-suite quiet-tail plus bounded review drift. Evidence: `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/00-summary.md`, `out/1215-coordinator-symphony-aligned-standalone-review-command-intent-classification-extraction/manual/20260315T102346Z-closeout/13-override-notes.md`.
---

# Technical Specification

## Context

The standalone-review execution-state file still contains a deterministic command-intent classifier cluster that is reused by review command-line analysis but not yet owned by its own helper boundary.

## Requirements

1. Extract the shared command-intent classifier seam from `scripts/lib/review-execution-state.ts`.
2. Preserve orchestration-command detection, direct validation runner detection, package-script validation-suite resolution, and violation-label formatting behavior for existing consumers.
3. Preserve the extracted helper family's `review-support` and touched-family behavior in `scripts/lib/review-meta-surface-normalization.ts`.
4. Keep the lane local to `review-execution-state` plus focused command-intent regressions.
5. Do not widen into command-probe classification, meta-surface analysis, startup-anchor handling, stateful review-boundary handling, or `run-review` runtime work.
6. Record review-reliability issues separately unless the command-intent extraction directly depends on them.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npm run lint`
- `npx vitest run --config vitest.config.core.ts tests/review-command-intent-classification.spec.ts tests/review-meta-surface-normalization.spec.ts tests/review-execution-state.spec.ts`
- `npm run review`
- `npm run pack:smoke`
