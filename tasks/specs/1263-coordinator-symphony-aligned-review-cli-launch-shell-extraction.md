---
id: 20260317-1263-coordinator-symphony-aligned-review-cli-launch-shell-extraction
title: Coordinator Symphony-Aligned Review CLI Launch Shell Extraction
status: completed
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-review-cli-launch-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-review-cli-launch-shell-extraction.md
related_tasks:
  - tasks/tasks-1263-coordinator-symphony-aligned-review-cli-launch-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1262` froze the remaining local `delegation` pocket. Current-tree inspection shows `handleReview(...)` still owns a bounded review launch shell above `scripts/run-review.ts`, so the next truthful nearby move is a dedicated review CLI launch shell extraction lane. Evidence: `out/1262-coordinator-symphony-aligned-delegation-cli-remaining-boundary-freeze-reassessment/manual/20260317T030333Z-closeout/14-next-slice-note.md`, `docs/findings/1263-review-cli-launch-shell-extraction-deliberation.md`.
  - 2026-03-17: Completed as a real extraction. The review launch shell now lives in `orchestrator/src/cli/reviewCliLaunchShell.ts`, focused helper plus CLI-shell parity passed, final-tree review returned no findings, and the full suite passed `259/259` files with `1808/1808` tests. Evidence: `out/1263-coordinator-symphony-aligned-review-cli-launch-shell-extraction/manual/20260317T034647Z-closeout/00-summary.md`.
---

# Technical Specification

## Context

The top-level `review` command family still owns a real launch shell above the already-separated standalone review wrapper.

## Requirements

1. Extract the inline review launch shell without changing user-facing behavior.
2. Keep the binary help surface local and unchanged.
3. Preserve source-vs-dist runner resolution, passthrough launch semantics, and exit-code propagation.
4. Keep `scripts/run-review.ts` and deeper review engine helpers out of scope.
5. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused review CLI launch coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline review launch shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
