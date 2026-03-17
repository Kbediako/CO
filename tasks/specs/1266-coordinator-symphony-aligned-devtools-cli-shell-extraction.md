---
id: 20260317-1266-coordinator-symphony-aligned-devtools-cli-shell-extraction
title: Coordinator Symphony-Aligned Devtools CLI Shell Extraction
status: active
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-devtools-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-devtools-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1266-coordinator-symphony-aligned-devtools-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1265` froze the remaining local `pr` pocket. Current-tree inspection plus bounded scouting show `handleDevtools(...)` still owns a bounded top-level shell above `orchestrator/src/cli/devtoolsSetup.ts`, so the next truthful nearby move is a dedicated devtools CLI shell extraction lane. The already-frozen internal devtools readiness family from `1243` remains out of scope. Evidence: `out/1265-coordinator-symphony-aligned-pr-cli-remaining-boundary-freeze-reassessment/manual/20260317T042400Z-closeout/14-next-slice-note.md`, `docs/findings/1266-devtools-cli-shell-extraction-deliberation.md`.
---

# Technical Specification

## Context

The top-level `devtools` command family still owns a real launch shell above the already-separated devtools setup engine.

## Requirements

1. Extract the inline `devtools` shell without changing user-facing behavior.
2. Preserve subcommand validation, JSON/text output shaping, incompatibility guards, downstream runner invocation, and summary emission.
3. Keep `orchestrator/src/cli/devtoolsSetup.ts` logic out of scope beyond the shell handoff.
4. Keep the already-frozen internal devtools readiness family out of scope.
5. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused devtools CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `devtools` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
