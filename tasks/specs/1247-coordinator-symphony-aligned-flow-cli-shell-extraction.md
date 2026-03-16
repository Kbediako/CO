---
id: 20260316-1247-coordinator-symphony-aligned-flow-cli-shell-extraction
title: Coordinator Symphony-Aligned Flow CLI Shell Extraction
status: active
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-flow-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-flow-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1247-coordinator-symphony-aligned-flow-cli-shell-extraction.md
review_notes:
  - 2026-03-16: Approved for docs-first extraction after `1246` froze the broader doctor command family and bounded scout evidence confirmed the remaining truthful seam is the inline `flow` command shell around `handleFlow(...)` and `resolveFlowTargetStageSelection(...)` in `bin/codex-orchestrator.ts`, with the shared start/issue-log helpers explicitly left out of scope unless extraction requires them. Evidence: `docs/findings/1247-flow-cli-shell-extraction-deliberation.md`, `out/1246-coordinator-symphony-aligned-doctor-readiness-and-advisory-command-family-reassessment/manual/20260316T133732Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

After `1246` froze, the next truthful mixed-ownership seam is the `flow` CLI shell still living inline in `bin/codex-orchestrator.ts`.

## Requirements

1. Extract the `flow` command shell out of `bin/codex-orchestrator.ts` without changing user-facing `flow` behavior.
2. Keep flow-owned target-stage selection with the extracted shell boundary.
3. Preserve docs-review to implementation-gate sequencing, shared auto-issue-log behavior, and output parity.
4. Limit the lane to the `flow` command family and adjacent focused tests.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused `tests/cli-command-surface.spec.ts` flow coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the `flow` command shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
