---
id: 20260317-1286-coordinator-symphony-aligned-doctor-cli-request-shell-extraction
title: Coordinator Symphony-Aligned Doctor CLI Request Shell Extraction
status: done
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-doctor-cli-request-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-doctor-cli-request-shell-extraction.md
related_tasks:
  - tasks/tasks-1286-coordinator-symphony-aligned-doctor-cli-request-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1285` closed as a truthful `go` reassessment. Current-tree inspection plus bounded scout evidence show the next truthful nearby binary-facing seam is the remaining doctor request-shaping shell still inline in `handleDoctor(...)` above `orchestrator/src/cli/doctorCliShell.ts`. Evidence: `out/1285-coordinator-symphony-aligned-doctor-cli-boundary-reassessment-revisit/manual/20260317T142824Z-closeout/00-summary.md`, `out/1285-coordinator-symphony-aligned-doctor-cli-boundary-reassessment-revisit/manual/20260317T142824Z-closeout/14-next-slice-note.md`, `docs/findings/1286-doctor-cli-request-shell-extraction-deliberation.md`.
  - 2026-03-17: Closed as a real extraction. `handleDoctor(...)` now keeps only shared `parseArgs(...)` ownership and a thin wrapper into `orchestrator/src/cli/doctorCliRequestShell.ts`, which owns the bounded binary-facing doctor request shell. The next truthful nearby move is `1287`, a freeze reassessment of the remaining local `doctor` pocket. Evidence: `out/1286-coordinator-symphony-aligned-doctor-cli-request-shell-extraction/manual/20260317T143325Z-closeout/00-summary.md`, `out/1286-coordinator-symphony-aligned-doctor-cli-request-shell-extraction/manual/20260317T143325Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The binary-facing `doctor` wrapper still owns a bounded local request-shaping shell above the lower doctor execution/output shell.

## Requirements

1. Extract doctor output-format selection, toggle wiring, dependent-flag guards, `--apply` plus `--format json` incompatibility guarding, `--window-days` validation, task-filter derivation, and `repoRoot` injection out of `handleDoctor(...)`.
2. Preserve the current error text and behavior.
3. Keep shared `parseArgs(...)` ownership and top-level command dispatch local in `bin/codex-orchestrator.ts`.
4. Avoid widening into lower doctor execution/output behavior or unrelated CLI families.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused doctor CLI/helper coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `codex-orchestrator review`
- `npm run pack:smoke`
