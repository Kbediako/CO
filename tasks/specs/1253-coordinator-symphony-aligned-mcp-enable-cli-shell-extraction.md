---
id: 20260317-1253-coordinator-symphony-aligned-mcp-enable-cli-shell-extraction
title: Coordinator Symphony-Aligned MCP Enable CLI Shell Extraction
status: active
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-mcp-enable-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-mcp-enable-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1253-coordinator-symphony-aligned-mcp-enable-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1252` confirmed the remaining local doctor pocket is exhausted. Current-tree inspection shows `mcp enable` still owns a bounded top-level shell above `orchestrator/src/cli/mcpEnable.ts`, so the next truthful move is a dedicated MCP enable shell extraction lane. Evidence: `out/1252-coordinator-symphony-aligned-doctor-cli-remaining-boundary-freeze-reassessment/manual/20260317T010338Z-closeout/14-next-slice-note.md`, `docs/findings/1253-mcp-enable-cli-shell-extraction-deliberation.md`.
---

# Technical Specification

## Context

`mcp enable` is still a real mixed shell boundary in `bin/codex-orchestrator.ts` even though its underlying engine already lives elsewhere.

## Requirements

1. Extract the `mcp enable` shell without changing user-facing behavior.
2. Preserve flag parsing, output shaping, and apply-failure exit-code behavior.
3. Keep the underlying MCP enable engine out of scope.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused MCP enable coverage in `tests/cli-command-surface.spec.ts`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the `mcp enable` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
