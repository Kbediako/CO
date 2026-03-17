---
id: 20260318-1289-coordinator-symphony-aligned-start-cli-request-shell-extraction
title: Coordinator Symphony-Aligned Start CLI Request Shell Extraction
status: done
owner: Codex
created: 2026-03-18
last_review: 2026-03-18
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-start-cli-request-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-start-cli-request-shell-extraction.md
related_tasks:
  - tasks/tasks-1289-coordinator-symphony-aligned-start-cli-request-shell-extraction.md
review_notes:
  - 2026-03-18: Opened after `1288` confirmed that `handleStart(...)` still owns a real binary-facing request-shaping seam above `orchestrator/src/cli/startCliShell.ts`. The next truthful nearby move is a bounded request-shell extraction that leaves shared parse/help ownership in the binary and lower lifecycle ownership in `startCliShell.ts`. Evidence: `out/1288-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit/manual/20260318T001200Z-closeout/00-summary.md`, `out/1288-coordinator-symphony-aligned-start-cli-boundary-reassessment-revisit/manual/20260318T001200Z-closeout/14-next-slice-note.md`, `docs/findings/1289-start-cli-request-shell-extraction-deliberation.md`.
  - 2026-03-18: Closed as a real extraction. `orchestrator/src/cli/startCliRequestShell.ts` now owns the remaining binary-facing start request shaping above `orchestrator/src/cli/startCliShell.ts`, leaving `handleStart(...)` in `bin/codex-orchestrator.ts` with shared parse/help ownership and a thin handoff. Evidence: `out/1289-coordinator-symphony-aligned-start-cli-request-shell-extraction/manual/20260317T150552Z-closeout/00-summary.md`, `out/1289-coordinator-symphony-aligned-start-cli-request-shell-extraction/manual/20260317T150552Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The remaining `start` wrapper logic is still broader than thin parse/help glue.

## Requirements

1. Extract the bounded `start` request shell.
2. Preserve current behavior and ownership boundaries.
3. Add focused parity for the extracted helper.
4. Avoid widening into lower `start` internals or unrelated CLI families.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- targeted tests
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
