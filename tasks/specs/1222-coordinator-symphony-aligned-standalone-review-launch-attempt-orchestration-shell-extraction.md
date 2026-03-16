---
id: 20260316-1222-coordinator-symphony-aligned-standalone-review-launch-attempt-orchestration-shell-extraction
title: Coordinator Symphony-Aligned Standalone Review Launch-Attempt Orchestration Shell Extraction
status: completed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-launch-attempt-orchestration-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-launch-attempt-orchestration-shell-extraction.md
related_tasks:
  - tasks/tasks-1222-coordinator-symphony-aligned-standalone-review-launch-attempt-orchestration-shell-extraction.md
review_notes:
  - 2026-03-16: `1221` narrowed the next truthful standalone-review seam to the remaining launch-attempt orchestration cluster in `scripts/run-review.ts`, specifically runtime-context resolution, command availability, scoped/unscoped arg resolution, artifact preparation, failure issue-log capture, and retry-without-scope-flags. Evidence: `out/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction/manual/20260315T233116Z-closeout/14-next-slice-note.md`, `docs/findings/1222-standalone-review-launch-attempt-orchestration-shell-extraction-deliberation.md`.
  - 2026-03-16: `1222` closed after extracting the launch-attempt shell into `scripts/lib/review-launch-attempt.ts`, keeping orchestration ownership in `scripts/run-review.ts`, and landing the bounded-review family parity fixes needed for helper/spec/runtime/state inspection. Final validation passed build, lint, focused regressions, full `npm run test` (`242/242` files, `1689/1689` tests), bounded review with no concrete findings, and `pack:smoke`. Evidence: `out/1222-coordinator-symphony-aligned-standalone-review-launch-attempt-orchestration-shell-extraction/manual/20260316T002200Z-closeout/00-summary.md`.
---

# Technical Specification

## Context

`1221` closed the execution runtime shell extraction and left one still-cohesive pre-runtime launch-attempt boundary inline in `scripts/run-review.ts`.

## Requirements

1. Extract the launch-attempt orchestration cluster behind a dedicated module boundary.
2. Preserve current runtime command resolution, scope-flag retry fallback, and failure issue-log capture behavior.
3. Keep `run-review.ts` responsible for top-level wrapper orchestration.
4. Add focused regression coverage for the extracted launch-attempt shell.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
