---
id: 20260317-1268-coordinator-symphony-aligned-init-cli-shell-extraction
title: Coordinator Symphony-Aligned Init CLI Shell Extraction
status: completed
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-init-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-init-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1268-coordinator-symphony-aligned-init-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1267` froze the remaining local devtools pocket. Current-tree inspection shows `handleInit(...)` still owns a bounded top-level shell above `orchestrator/src/cli/init.ts` and `orchestrator/src/cli/codexCliSetup.ts`, so the next truthful nearby move is a dedicated init CLI shell extraction lane. Evidence: `out/1267-coordinator-symphony-aligned-devtools-cli-remaining-boundary-freeze-reassessment/manual/20260317T050808Z-closeout/14-next-slice-note.md`, `docs/findings/1268-init-cli-shell-extraction-deliberation.md`.
  - 2026-03-17: Closed as a real extraction. `bin/codex-orchestrator.ts` now keeps the top-level `init` parse and help boundary while `orchestrator/src/cli/initCliShell.ts` owns the bounded launch shell above `orchestrator/src/cli/init.ts` and `orchestrator/src/cli/codexCliSetup.ts`. Evidence: `out/1268-coordinator-symphony-aligned-init-cli-shell-extraction/manual/20260317T053202Z-closeout/00-summary.md`.
---

# Technical Specification

## Context

The top-level `init` command family still owns a bounded launch shell above the existing init-template and managed-Codex setup helpers.

## Requirements

1. Extract the inline `init` shell without changing user-facing behavior.
2. Preserve `init codex` validation, cwd/force resolution, summary emission, and the optional `--codex-cli` follow-on setup path.
3. Keep `orchestrator/src/cli/init.ts` and `orchestrator/src/cli/codexCliSetup.ts` behavior out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused init CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `init` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
