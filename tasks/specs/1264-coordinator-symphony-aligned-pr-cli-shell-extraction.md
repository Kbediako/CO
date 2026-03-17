---
id: 20260317-1264-coordinator-symphony-aligned-pr-cli-shell-extraction
title: Coordinator Symphony-Aligned PR CLI Shell Extraction
status: active
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-pr-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-pr-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1264-coordinator-symphony-aligned-pr-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1263` extracted the remaining review launch shell and froze the local review pocket. Current-tree inspection plus bounded scouting show `handlePr(...)` still owns a bounded top-level shell above `scripts/lib/pr-watch-merge.js`, so the next truthful nearby move is a dedicated PR CLI shell extraction lane. Evidence: `out/1263-coordinator-symphony-aligned-review-cli-launch-shell-extraction/manual/20260317T034647Z-closeout/14-next-slice-note.md`, `docs/findings/1264-pr-cli-shell-extraction-deliberation.md`.
---

# Technical Specification

## Context

The top-level `pr` command family still owns a real launch shell above the already-separated PR watch/merge runner.

## Requirements

1. Extract the inline `pr` shell without changing user-facing behavior.
2. Keep the top-level `pr` help surface local and unchanged.
3. Preserve subcommand validation, mode selection, downstream runner invocation, and exit-code propagation.
4. Keep `scripts/lib/pr-watch-merge.js` and deeper PR monitor logic out of scope.
5. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused PR CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `pr` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
