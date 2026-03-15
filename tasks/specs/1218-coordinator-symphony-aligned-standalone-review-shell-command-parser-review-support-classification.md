---
id: 20260315-1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification
title: Coordinator Symphony-Aligned Standalone Review Shell Command Parser Review-Support Classification
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md
related_tasks:
  - tasks/tasks-1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md
review_notes:
  - 2026-03-15: Local read-only reassessment plus bounded scout approval confirm a real support-family parity gap after `1217`. The extracted shell-command parser family is reused by the adjacent standalone-review helpers but is still omitted from the `review-support` classifier and touched-family exemptions in `scripts/lib/review-meta-surface-normalization.ts`. Evidence: `docs/findings/1218-standalone-review-shell-command-parser-review-support-classification-deliberation.md`, `out/1217-coordinator-symphony-aligned-standalone-review-execution-telemetry-surface-extraction/manual/20260315T125429Z-closeout/14-next-slice-note.md`, `scripts/lib/review-meta-surface-normalization.ts`, `scripts/lib/review-shell-command-parser.ts`.
---

# Technical Specification

## Context

The standalone-review support-family classifier still points at the older adjacent helper families even though `1211` extracted the shared shell-command parser into its own helper module.

## Requirements

1. Classify `scripts/lib/review-shell-command-parser.ts` as `review-support`.
2. Classify `dist/scripts/lib/review-shell-command-parser.js` as `review-support`.
3. Extend the local touched-family exemption logic so the parser helper source and built pair inherit the same bounded diff behavior as the adjacent standalone-review helper families.
4. Keep the lane local to support-family classification and its focused regressions.
5. Do not widen into shell-command parser behavior changes, new helper extraction, or `scripts/run-review.ts` runtime supervision.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-meta-surface-normalization.spec.ts tests/review-execution-state.spec.ts`
- `npm run review`
- `npm run pack:smoke`
