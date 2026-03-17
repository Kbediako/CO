---
id: 20260317-1278-coordinator-symphony-aligned-rlm-cli-completion-and-state-reporting-shell-extraction
title: Coordinator Symphony-Aligned RLM CLI Completion and State Reporting Shell Extraction
status: active
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-rlm-cli-completion-and-state-reporting-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-rlm-cli-completion-and-state-reporting-shell-extraction.md
related_tasks:
  - tasks/tasks-1278-coordinator-symphony-aligned-rlm-cli-completion-and-state-reporting-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1277` closed as a `go` reassessment. Current-tree inspection plus bounded scout evidence shows the remaining truthful nearby seam is the RLM post-start completion/state-reporting path still inline in `handleRlm(...)`. Evidence: `out/1277-coordinator-symphony-aligned-rlm-cli-boundary-reassessment/manual/20260317T123845Z-closeout/00-summary.md`, `out/1277-coordinator-symphony-aligned-rlm-cli-boundary-reassessment/manual/20260317T123845Z-closeout/14-next-slice-note.md`, `docs/findings/1278-rlm-cli-completion-and-state-reporting-shell-extraction-deliberation.md`.
  - 2026-03-17: Closed after extracting `orchestrator/src/cli/rlmCompletionCliShell.ts`. The remaining truthful nearby seam is the inline RLM launch/start shell still owned by `handleRlm(...)`, so the next slice is `1279`. Evidence: `out/1278-coordinator-symphony-aligned-rlm-cli-completion-and-state-reporting-shell-extraction/manual/20260317T125403Z-closeout/00-summary.md`, `out/1278-coordinator-symphony-aligned-rlm-cli-completion-and-state-reporting-shell-extraction/manual/20260317T125403Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The local `rlm` wrapper still owns a bounded post-start completion/reporting shell above the deeper RLM runtime.

## Requirements

1. Extract manifest completion polling, `rlm/state.json` readback, final `RLM status` reporting, and exit-code mapping out of `handleRlm(...)`.
2. Preserve current binary-facing help/parse/runtime/repo-policy/goal-task resolution ownership locally in `bin/codex-orchestrator.ts`.
3. Preserve the missing-state fallback behavior that reports internal error and exits with code `10`.
4. Avoid widening into `rlmRunner.ts` runtime internals or unrelated CLI families.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused RLM CLI/helper coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `codex-orchestrator review`
- `npm run pack:smoke`
