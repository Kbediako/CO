---
id: 20260317-1259-coordinator-symphony-aligned-delegation-server-cli-shell-extraction
title: Coordinator Symphony-Aligned Delegation Server CLI Shell Extraction
status: completed
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-delegation-server-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-delegation-server-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1259-coordinator-symphony-aligned-delegation-server-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1258` froze the remaining local `skills` pocket. Current-tree inspection shows `handleDelegationServer(...)` still owns a bounded shell above `orchestrator/src/cli/delegationServer.ts`, so the next truthful nearby move is a dedicated delegation-server CLI shell extraction lane. Evidence: `out/1258-coordinator-symphony-aligned-skills-cli-remaining-boundary-freeze-reassessment/manual/20260317T020243Z-closeout/14-next-slice-note.md`, `docs/findings/1259-delegation-server-cli-shell-extraction-deliberation.md`.
  - 2026-03-17: Completed. `handleDelegationServer(...)` now delegates its shell-owned help gating, repo/mode/config normalization, and warn-only invalid-mode fallback into `orchestrator/src/cli/delegationServerCliShell.ts`, leaving `bin/codex-orchestrator.ts` as the thin parse/help wrapper. Focused parity passed in `orchestrator/tests/DelegationServerCliShell.test.ts` and `tests/cli-command-surface.spec.ts`, and the next truthful nearby move is a freeze reassessment of the remaining local delegation-server pocket. Evidence: `out/1259-coordinator-symphony-aligned-delegation-server-cli-shell-extraction/manual/20260317T022241Z-closeout/00-summary.md`.
---

# Technical Specification

## Context

The top-level `delegation-server` command family still owns a real shell above the already-separated delegation-server engine.

## Requirements

1. Extract the inline `delegation-server` shell without changing user-facing behavior.
2. Preserve help gating, mode resolution, invalid-mode warning fallback, config-override parsing, and handoff behavior.
3. Keep the underlying delegation-server engine out of scope.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused delegation-server CLI coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `delegation-server` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
