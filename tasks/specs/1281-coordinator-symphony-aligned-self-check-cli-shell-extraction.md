---
id: 20260317-1281-coordinator-symphony-aligned-self-check-cli-shell-extraction
title: Coordinator Symphony-Aligned Self-Check CLI Shell Extraction
status: active
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-self-check-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-self-check-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1281-coordinator-symphony-aligned-self-check-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1280` closed as a truthful freeze. Current-tree inspection shows the next truthful nearby binary-facing seam is the inline `self-check` output shell still owned by `handleSelfCheck(...)` above `orchestrator/src/cli/selfCheck.ts`. Evidence: `out/1280-coordinator-symphony-aligned-rlm-cli-remaining-boundary-freeze-reassessment/manual/20260317T132919Z-closeout/00-summary.md`, `out/1280-coordinator-symphony-aligned-rlm-cli-remaining-boundary-freeze-reassessment/manual/20260317T132919Z-closeout/14-next-slice-note.md`, `docs/findings/1281-self-check-cli-shell-extraction-deliberation.md`.
---

# Technical Specification

## Context

The binary-facing `self-check` wrapper still owns a small but real output shell above the lower self-check helper.

## Requirements

1. Extract `self-check` format selection and text/json emission out of `handleSelfCheck(...)`.
2. Preserve the exact text-mode field ordering and JSON payload shape.
3. Keep shared `parseArgs(...)` ownership and top-level command dispatch local in `bin/codex-orchestrator.ts`.
4. Avoid widening into unrelated CLI families or changing `buildSelfCheckResult()`.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused self-check CLI/helper coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `codex-orchestrator review`
- `npm run pack:smoke`
