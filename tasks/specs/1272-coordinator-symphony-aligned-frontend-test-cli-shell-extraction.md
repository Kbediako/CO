---
id: 20260317-1272-coordinator-symphony-aligned-frontend-test-cli-shell-extraction
title: Coordinator Symphony-Aligned Frontend-Test CLI Shell Extraction
status: active
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-frontend-test-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-frontend-test-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1272-coordinator-symphony-aligned-frontend-test-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1271` extracted the local start shell. Current-tree inspection shows `handleFrontendTest(...)` still owns a bounded binary-facing launch shell above `orchestrator.start(...)`, so the next truthful nearby move is a dedicated frontend-test CLI shell extraction lane. Evidence: `out/1271-coordinator-symphony-aligned-start-cli-shell-extraction/manual/20260317T074911Z-closeout/00-summary.md`, `out/1271-coordinator-symphony-aligned-start-cli-shell-extraction/manual/20260317T074911Z-closeout/14-next-slice-note.md`, `docs/findings/1272-frontend-test-cli-shell-extraction-deliberation.md`.
---

# Technical Specification

## Context

The top-level `frontend-test` command family still owns a bounded launch shell above the deeper frontend-testing runtime.

## Requirements

1. Extract the inline `frontend-test` shell without changing user-facing behavior.
2. Preserve output-format and runtime-mode resolution, repo-policy application, the `CODEX_REVIEW_DEVTOOLS` env toggle and restoration behavior, `withRunUi(...)` handoff, output emission, and exit-code mapping.
3. Keep the deeper frontend-testing runtime under `orchestrator/src/cli/frontendTestingRunner.ts` out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused frontend-test CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `frontend-test` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
