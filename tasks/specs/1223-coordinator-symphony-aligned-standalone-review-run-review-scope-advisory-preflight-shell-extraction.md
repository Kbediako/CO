---
id: 20260316-1223-coordinator-symphony-aligned-standalone-review-run-review-scope-advisory-preflight-shell-extraction
title: Coordinator Symphony-Aligned Standalone Review Run-Review Scope Advisory Preflight Shell Extraction
status: completed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-scope-advisory-preflight-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-scope-advisory-preflight-shell-extraction.md
related_tasks:
  - tasks/tasks-1223-coordinator-symphony-aligned-standalone-review-run-review-scope-advisory-preflight-shell-extraction.md
review_notes:
  - 2026-03-16: `1220` closed the broader `run-review.ts` orchestration reassessment and `1222` closed the launch-attempt shell, leaving the pre-launch scope assessment and scope-advisory shaping block as the next truthful implementation seam in `scripts/run-review.ts`. Evidence: `out/1220-coordinator-symphony-aligned-standalone-review-run-review-orchestration-boundary-reassessment/manual/20260315T213146Z-closeout/00-summary.md`, `out/1222-coordinator-symphony-aligned-standalone-review-launch-attempt-orchestration-shell-extraction/manual/20260316T002200Z-closeout/14-next-slice-note.md`, `docs/findings/1223-standalone-review-run-review-scope-advisory-preflight-shell-extraction-deliberation.md`.
  - 2026-03-16: Approved for docs-first registration as a bounded behavior-preserving extraction lane around scope-mode resolution, scope-path collection, large-scope assessment, and advisory prompt/log shaping. Evidence: `docs/findings/1223-standalone-review-run-review-scope-advisory-preflight-shell-extraction-deliberation.md`.
  - 2026-03-16: Completed. The scope/advisory preflight shell now lives in `scripts/lib/review-scope-advisory.ts`; the initial bounded review found one real sibling-touch parity gap in `review-meta-surface-normalization.ts`, the shipped tree fixed it with focused regression coverage, and final validation passed through build, lint, full test (`243/243` files, `1697/1697` tests), bounded review with no further concrete findings, and `pack:smoke`. Evidence: `out/1223-coordinator-symphony-aligned-standalone-review-run-review-scope-advisory-preflight-shell-extraction/manual/20260316T014129Z-closeout/00-summary.md`, `out/1223-coordinator-symphony-aligned-standalone-review-run-review-scope-advisory-preflight-shell-extraction/manual/20260316T014129Z-closeout/05-test.log`, `out/1223-coordinator-symphony-aligned-standalone-review-run-review-scope-advisory-preflight-shell-extraction/manual/20260316T014129Z-closeout/09-review.log`, `out/1223-coordinator-symphony-aligned-standalone-review-run-review-scope-advisory-preflight-shell-extraction/manual/20260316T014129Z-closeout/10-pack-smoke.log`.
---

# Technical Specification

## Context

`1222` removed the launch-attempt shell from `scripts/run-review.ts`, but the file still owns one cohesive pre-launch scope/advisory contract before artifact preparation and runtime launch.

## Requirements

1. Extract the scope/advisory preflight cluster behind a dedicated module boundary.
2. Preserve commit/base/uncommitted scope-note rendering, including rename/copy identity preservation and path-only prompt notes.
3. Preserve large-scope assessment behavior, including file/line thresholds, untracked-line counting, and advisory wording.
4. Keep `run-review.ts` responsible for broader wrapper orchestration.
5. Add focused regression coverage for the extracted scope/advisory shell.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
