---
id: 20260315-1212-coordinator-symphony-aligned-standalone-review-operand-path-normalization-boundary-extraction
title: Coordinator Symphony-Aligned Standalone Review Operand Path Normalization Boundary Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-operand-path-normalization-boundary-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-operand-path-normalization-boundary-extraction.md
related_tasks:
  - tasks/tasks-1212-coordinator-symphony-aligned-standalone-review-operand-path-normalization-boundary-extraction.md
review_notes:
  - 2026-03-15: Local read-only reassessment after `1211` approves a narrow operand/path normalization extraction. The remaining truthful seam is the shared normalization cluster reused across operand expansion, audit env-var path resolution, git-revision path extraction, and audit startup-anchor path matching inside `scripts/lib/review-execution-state.ts`. Evidence: `docs/findings/1212-standalone-review-operand-path-normalization-boundary-extraction-deliberation.md`, `scripts/lib/review-execution-state.ts`.
  - 2026-03-15: Closeout keeps the extraction bounded to normalization/classification helpers. A bounded review found one real regression in helper-family review-support classification, which was fixed before final validation; the remaining review activity drifted and is carried as an override. Evidence: `scripts/lib/review-meta-surface-normalization.ts`, `tests/review-meta-surface-normalization.spec.ts`, `out/1212-coordinator-symphony-aligned-standalone-review-operand-path-normalization-boundary-extraction/manual/20260315T062628Z-closeout/13-override-notes.md`.
---

# Technical Specification

## Context

The standalone-review execution-state file still contains a shared operand/path normalization cluster that is reused by multiple analyses but not yet owned by its own helper boundary.

## Requirements

1. Extract the shared operand/path normalization seam from `scripts/lib/review-execution-state.ts`.
2. Preserve current operand expansion, audit env-var path resolution, git-revision path extraction, and audit startup-anchor path matching semantics for existing consumers.
3. Keep the lane local to `review-execution-state` plus focused normalization regressions.
4. Do not widen into shell traversal, shell-command parsing, shell-env interpretation, or unrelated review-policy changes.
5. Record any review-reliability issues separately unless the normalization extraction directly depends on them.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-meta-surface-normalization.spec.ts tests/review-execution-state.spec.ts`
- `npm run review`
- `npm run pack:smoke`
