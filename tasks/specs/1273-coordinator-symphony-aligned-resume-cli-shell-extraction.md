---
id: 20260317-1273-coordinator-symphony-aligned-resume-cli-shell-extraction
title: Coordinator Symphony-Aligned Resume CLI Shell Extraction
status: active
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-resume-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-resume-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1273-coordinator-symphony-aligned-resume-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1272` extracted the local frontend-test shell. Current-tree inspection shows `handleResume(...)` still owns a bounded binary-facing launch shell above `orchestrator.resume(...)`, so the next truthful nearby move is a dedicated resume CLI shell extraction lane. Evidence: `out/1272-coordinator-symphony-aligned-frontend-test-cli-shell-extraction/manual/20260317T081917Z-closeout/00-summary.md`, `out/1272-coordinator-symphony-aligned-frontend-test-cli-shell-extraction/manual/20260317T081917Z-closeout/14-next-slice-note.md`, `docs/findings/1273-resume-cli-shell-extraction-deliberation.md`.
---

# Technical Specification

## Context

The top-level `resume` command family still owns a bounded launch shell above the deeper resume lifecycle.

## Requirements

1. Extract the inline `resume` shell without changing user-facing behavior.
2. Preserve help gating, run-id resolution, runtime-mode resolution, repo-policy application, `withRunUi(...)` handoff, the `orchestrator.resume(...)` call shape, and output emission.
3. Keep the deeper resume-preparation lifecycle under `orchestrator/src/cli/orchestrator.ts` and service shells out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused resume CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `resume` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
