---
id: 20260317-1271-coordinator-symphony-aligned-start-cli-shell-extraction
title: Coordinator Symphony-Aligned Start CLI Shell Extraction
status: active
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-start-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-start-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1271-coordinator-symphony-aligned-start-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1270` extracted the local exec shell. Current-tree inspection shows `handleStart(...)` still owns a bounded binary-facing launch shell above `orchestrator.start(...)`, so the next truthful nearby move is a dedicated start CLI shell extraction lane. Evidence: `out/1270-coordinator-symphony-aligned-exec-cli-shell-extraction/manual/20260317T063411Z-closeout/14-next-slice-note.md`, `docs/findings/1271-start-cli-shell-extraction-deliberation.md`.
---

# Technical Specification

## Context

The top-level `start` command family still owns a bounded launch shell above the deeper orchestrator lifecycle.

## Requirements

1. Extract the inline `start` shell without changing user-facing behavior.
2. Preserve help gating, output-format and execution/runtime-mode resolution, repo-policy application, `rlm`-specific env shaping, `withRunUi(...)` handoff, auto issue-log capture, output emission, exit-code mapping, and post-success adoption-hint behavior.
3. Keep the deeper orchestrator lifecycle under `orchestrator/src/cli/orchestrator.ts` and service shells out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused start CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `start` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
