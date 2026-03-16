---
id: 20260316-1224-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction
title: Coordinator Symphony-Aligned Standalone Review Run-Review Execution-Boundary Preflight Shell Extraction
status: completed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction.md
related_tasks:
  - tasks/tasks-1224-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction.md
review_notes:
  - 2026-03-16: `1223` completed the scope/advisory preflight extraction and left the execution-boundary setup above `runCodexReview(...)` as the next truthful implementation seam in `scripts/run-review.ts`. Evidence: `out/1223-coordinator-symphony-aligned-standalone-review-run-review-scope-advisory-preflight-shell-extraction/manual/20260316T014129Z-closeout/00-summary.md`, `out/1223-coordinator-symphony-aligned-standalone-review-run-review-scope-advisory-preflight-shell-extraction/manual/20260316T014129Z-closeout/14-next-slice-note.md`, `docs/findings/1224-standalone-review-run-review-execution-boundary-preflight-shell-extraction-deliberation.md`.
  - 2026-03-16: Approved for docs-first registration as a bounded behavior-preserving extraction lane around execution-boundary preflight normalization, env-driven timeout/startup-loop parsing, and launch-boundary handoff shaping. Evidence: `docs/findings/1224-standalone-review-run-review-execution-boundary-preflight-shell-extraction-deliberation.md`.
  - 2026-03-16: Completed. The execution-boundary preflight shell now lives in `scripts/lib/review-execution-boundary-preflight.ts`; bounded review first surfaced two real review-support parity gaps, the shipped tree fixed both and narrowed the resulting focused-spec widening regression, and final validation passed through build, lint, full test (`244/244` files, `1713/1713` tests), focused helper/meta-surface reruns, and `pack:smoke`, with the final bounded-review wrapper recorded as drift after it stopped producing concrete diff-local findings. Evidence: `out/1224-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction/manual/20260316T031419Z-closeout/00-summary.md`, `out/1224-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction/manual/20260316T031419Z-closeout/05a-targeted-tests.log`, `out/1224-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction/manual/20260316T031419Z-closeout/05-test.log`, `out/1224-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction/manual/20260316T031419Z-closeout/09-review.log`, `out/1224-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction/manual/20260316T031419Z-closeout/10-pack-smoke.log`.
---

# Technical Specification

## Context

`1223` removed the scope/advisory preflight shell from `scripts/run-review.ts`, but the file still owns one cohesive execution-boundary contract before review launch.

## Requirements

1. Extract the execution-boundary preflight cluster behind a dedicated module boundary.
2. Preserve current bounded-mode, timeout, and startup-loop behavior.
3. Preserve current audit/architecture/diff-mode boundary wiring and launch guidance strings.
4. Keep `run-review.ts` responsible for broader wrapper orchestration.
5. Add focused regression coverage for the extracted execution-boundary shell.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
