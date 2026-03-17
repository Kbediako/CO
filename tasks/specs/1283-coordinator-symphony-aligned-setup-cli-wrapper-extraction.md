---
id: 20260317-1283-coordinator-symphony-aligned-setup-cli-wrapper-extraction
title: Coordinator Symphony-Aligned Setup CLI Wrapper Extraction
status: active
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-setup-cli-wrapper-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-setup-cli-wrapper-extraction.md
related_tasks:
  - tasks/tasks-1283-coordinator-symphony-aligned-setup-cli-wrapper-extraction.md
review_notes:
  - 2026-03-17: Opened after `1282` closed as a truthful freeze. Current-tree inspection plus bounded scout evidence shows the next truthful nearby binary-facing seam is the inline `setup` wrapper still owned by `handleSetup(...)` above `orchestrator/src/cli/setupBootstrapShell.ts`. Evidence: `out/1282-coordinator-symphony-aligned-self-check-cli-remaining-boundary-freeze-reassessment/manual/20260317T135320Z-closeout/00-summary.md`, `out/1282-coordinator-symphony-aligned-self-check-cli-remaining-boundary-freeze-reassessment/manual/20260317T135320Z-closeout/14-next-slice-note.md`, `docs/findings/1283-setup-cli-wrapper-extraction-deliberation.md`.
---

# Technical Specification

## Context

The binary-facing `setup` wrapper still owns a bounded local shell above the lower setup bootstrap shell.

## Requirements

1. Extract setup help text, local `--format json` plus `--yes` incompatibility guarding, repo flag/default resolution, and wrapper handoff out of `handleSetup(...)`.
2. Preserve the current help text and error semantics.
3. Keep shared `parseArgs(...)` ownership and top-level command dispatch local in `bin/codex-orchestrator.ts`.
4. Avoid widening into lower setup bootstrap behavior or unrelated CLI families.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused setup CLI/helper coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `codex-orchestrator review`
- `npm run pack:smoke`
