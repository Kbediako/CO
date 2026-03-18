---
id: 20260317-1270-coordinator-symphony-aligned-exec-cli-shell-extraction
title: Coordinator Symphony-Aligned Exec CLI Shell Extraction
status: done
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-exec-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-exec-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1270-coordinator-symphony-aligned-exec-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1269` froze the remaining local init pocket. Current-tree inspection shows `handleExec(...)` still owns a bounded binary-facing launch shell above `orchestrator/src/cli/exec/command.ts`, so the next truthful nearby move is a dedicated exec CLI shell extraction lane. Evidence: `out/1269-coordinator-symphony-aligned-init-cli-remaining-boundary-freeze-reassessment/manual/20260317T060903Z-closeout/14-next-slice-note.md`, `docs/findings/1270-exec-cli-shell-extraction-deliberation.md`.
---

# Technical Specification

## Context

The top-level `exec` command family still owns a bounded launch shell above the existing exec engine.

## Requirements

1. Extract the inline `exec` shell without changing user-facing behavior.
2. Preserve empty-command validation, output-mode resolution, environment normalization with optional task override, invocation shaping, exit-code mapping, and the interactive adoption-hint follow-on.
3. Keep the deeper execution lifecycle in `orchestrator/src/cli/exec/command.ts` out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused exec CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `exec` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
