---
id: 20260315-1213-coordinator-symphony-aligned-standalone-review-inspection-target-parsing-pipeline-extraction
title: Coordinator Symphony-Aligned Standalone Review Inspection Target Parsing Pipeline Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-inspection-target-parsing-pipeline-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-inspection-target-parsing-pipeline-extraction.md
related_tasks:
  - tasks/tasks-1213-coordinator-symphony-aligned-standalone-review-inspection-target-parsing-pipeline-extraction.md
review_notes:
  - 2026-03-15: Local read-only reassessment after `1212` approves a narrow inspection-target parsing extraction. The remaining truthful seam is the deterministic target-extraction cluster reused by command-line and narrative inspection analyzers inside `scripts/lib/review-execution-state.ts`. Evidence: `docs/findings/1213-standalone-review-inspection-target-parsing-pipeline-extraction-deliberation.md`, `scripts/lib/review-execution-state.ts`.
  - 2026-03-15: Closeout keeps the extraction bounded to the inspection-target parsing pipeline. A bounded review found one real helper-family touched-path regression in `review-meta-surface-normalization`, which was fixed before final validation; the remaining review activity drifted and is carried as an override. Evidence: `scripts/lib/review-meta-surface-normalization.ts`, `tests/review-meta-surface-normalization.spec.ts`, `out/1213-coordinator-symphony-aligned-standalone-review-inspection-target-parsing-pipeline-extraction/manual/20260315T070736Z-closeout/13-override-notes.md`.
---

# Technical Specification

## Context

The standalone-review execution-state file still contains a deterministic inspection-target parsing pipeline that is reused by multiple analyzers but not yet owned by its own helper boundary.

## Requirements

1. Extract the shared inspection-target parsing seam from `scripts/lib/review-execution-state.ts`.
2. Preserve current command-target normalization, nested payload parsing, touched-path prioritization, and generic file-target fallback semantics for existing consumers.
3. Keep the lane local to `review-execution-state` plus focused parsing regressions.
4. Do not widen into command-intent, shell-probe, startup-anchor, summary, shell-env traversal/state handling, or `run-review` runtime work.
5. Record review-reliability issues separately unless the parsing extraction directly depends on them.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-inspection-target-parsing.spec.ts tests/review-meta-surface-normalization.spec.ts tests/review-execution-state.spec.ts`
- `npm run review`
- `npm run pack:smoke`
