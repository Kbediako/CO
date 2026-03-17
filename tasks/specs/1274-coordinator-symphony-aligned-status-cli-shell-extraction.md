---
id: 20260317-1274-coordinator-symphony-aligned-status-cli-shell-extraction
title: Coordinator Symphony-Aligned Status CLI Shell Extraction
status: active
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-status-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-status-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1274-coordinator-symphony-aligned-status-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1273` extracted the local resume shell. Current-tree inspection shows `handleStatus(...)` still owns a bounded binary-facing shell above `orchestrator.status(...)`, so the next truthful nearby move is a dedicated status CLI shell extraction lane. Evidence: `out/1273-coordinator-symphony-aligned-resume-cli-shell-extraction/manual/20260317T114549Z-closeout/00-summary.md`, `out/1273-coordinator-symphony-aligned-resume-cli-shell-extraction/manual/20260317T114549Z-closeout/14-next-slice-note.md`, `docs/findings/1274-status-cli-shell-extraction-deliberation.md`.
---

# Technical Specification

## Context

The top-level `status` command family still owns a bounded shell above the deeper status service behavior.

## Requirements

1. Extract the inline `status` shell without changing user-facing behavior.
2. Preserve help gating, run-id resolution, watch and format parsing, interval parsing, the inline watch-loop termination behavior, and the `orchestrator.status(...)` call shape.
3. Keep the deeper status formatting and service behavior under `orchestrator/src/cli/orchestrator.ts` and the lower-layer status shell out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused status CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `status` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
