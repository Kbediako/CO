---
id: 20260317-1255-coordinator-symphony-aligned-codex-setup-and-defaults-cli-shell-extraction
title: Coordinator Symphony-Aligned Codex Setup And Defaults CLI Shell Extraction
status: completed
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-codex-setup-and-defaults-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-codex-setup-and-defaults-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1255-coordinator-symphony-aligned-codex-setup-and-defaults-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1254` froze the remaining local `mcp` pocket. Current-tree inspection shows `handleCodex(...)` still owns a bounded setup/defaults shell family above `orchestrator/src/cli/codexCliSetup.ts` and `orchestrator/src/cli/codexDefaultsSetup.ts`, so the next truthful nearby move is a dedicated codex CLI shell extraction lane. Evidence: `out/1254-coordinator-symphony-aligned-mcp-cli-remaining-boundary-freeze-reassessment/manual/20260317T010356Z-closeout/14-next-slice-note.md`, `docs/findings/1255-codex-setup-and-defaults-cli-shell-extraction-deliberation.md`.
  - 2026-03-17: Completed. `handleCodex(...)` now delegates the setup/defaults subcommand family to `orchestrator/src/cli/codexCliShell.ts`, preserving help gating, flag mapping, JSON/text output, and unknown-subcommand handling with focused helper and CLI parity coverage. Evidence: `out/1255-coordinator-symphony-aligned-codex-setup-and-defaults-cli-shell-extraction/manual/20260317T012819Z-closeout/00-summary.md`.
---

# Technical Specification

## Context

The top-level `codex` command family still owns a real shell above already-separated setup/defaults engines.

## Requirements

1. Extract the inline `codex` setup/defaults shell family without changing user-facing behavior.
2. Preserve help gating, flag mapping, JSON/text output, and unknown-subcommand handling.
3. Keep the underlying setup/defaults engines out of scope.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused codex CLI coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `codex` shell family is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
