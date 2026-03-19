---
id: 20260317-1261-coordinator-symphony-aligned-delegation-setup-cli-shell-extraction
title: Coordinator Symphony-Aligned Delegation Setup CLI Shell Extraction
status: completed
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-delegation-setup-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-delegation-setup-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1261-coordinator-symphony-aligned-delegation-setup-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1260` froze the remaining local delegation-server pocket. Current-tree inspection shows `handleDelegation(...)` still owns a bounded `delegation setup` shell above `orchestrator/src/cli/delegationSetup.ts`, so the next truthful nearby move is a dedicated delegation setup CLI shell extraction lane. Evidence: `out/1260-coordinator-symphony-aligned-delegation-server-cli-remaining-boundary-freeze-reassessment/manual/20260317T023928Z-closeout/14-next-slice-note.md`, `docs/findings/1261-delegation-setup-cli-shell-extraction-deliberation.md`.
  - 2026-03-17: Completed. `handleDelegation(...)` now delegates its subcommand validation, apply/format compatibility checks, repo-root resolution, and summary rendering into `orchestrator/src/cli/delegationCliShell.ts`, leaving `bin/codex-orchestrator.ts` as the thin parse-only wrapper. Focused parity passed in `orchestrator/tests/DelegationCliShell.test.ts` and `tests/cli-command-surface.spec.ts`, and the next truthful nearby move is a freeze reassessment of the remaining local `delegation` pocket. Evidence: `out/1261-coordinator-symphony-aligned-delegation-setup-cli-shell-extraction/manual/20260317T025705Z-closeout/00-summary.md`.
---

# Technical Specification

## Context

The top-level `delegation setup` command family still owns a real shell above the already-separated delegation setup engine.

## Requirements

1. Extract the inline `delegation setup` shell without changing user-facing behavior.
2. Preserve subcommand validation, apply/format compatibility checks, repo-root resolution, and summary rendering behavior.
3. Keep the underlying delegation setup engine out of scope.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused delegation setup CLI coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `delegation setup` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
