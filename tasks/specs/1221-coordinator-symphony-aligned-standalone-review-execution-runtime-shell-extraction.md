---
id: 20260316-1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction
title: Coordinator Symphony-Aligned Standalone Review Execution Runtime Shell Extraction
status: completed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md
related_tasks:
  - tasks/tasks-1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction.md
review_notes:
  - 2026-03-16: `1220` narrowed the next truthful standalone-review implementation seam to the child execution and termination-monitor shell around `runCodexReview(...)` and `waitForChildExit(...)`. Evidence: `docs/findings/1221-standalone-review-execution-runtime-shell-extraction-deliberation.md`, `out/1220-coordinator-symphony-aligned-standalone-review-run-review-orchestration-boundary-reassessment/manual/20260315T213146Z-closeout/14-next-slice-note.md`.
  - 2026-03-16: Closed with the runtime shell extracted into `scripts/lib/review-execution-runtime.ts`, focused regressions green (`306/306`), full validation green (`241/241` files, `1667/1667` tests), bounded review no findings, and `pack:smoke` passed. Evidence: `out/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction/manual/20260315T233116Z-closeout/00-summary.md`.
---

# Technical Specification

## Context

`1220` closed as a positive reassessment and identified one credible next boundary: the execution runtime shell still embedded in `scripts/run-review.ts`.

## Requirements

1. Extract the child execution and termination-monitor shell behind a dedicated module boundary.
2. Preserve current `ReviewExecutionState` integration and `CodexReviewError` behavior.
3. Keep `main()` responsible for higher-level orchestration and telemetry write/retry behavior.
4. Add focused regression coverage for the extracted runtime shell.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
