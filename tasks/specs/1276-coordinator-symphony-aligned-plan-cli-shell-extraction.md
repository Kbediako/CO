---
id: 20260317-1276-coordinator-symphony-aligned-plan-cli-shell-extraction
title: Coordinator Symphony-Aligned Plan CLI Shell Extraction
status: done
owner: Codex
created: 2026-03-17
last_review: 2026-03-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-plan-cli-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-plan-cli-shell-extraction.md
related_tasks:
  - tasks/tasks-1276-coordinator-symphony-aligned-plan-cli-shell-extraction.md
review_notes:
  - 2026-03-17: Opened after `1275` froze the remaining local `status` pocket. Current-tree inspection shows `handlePlan(...)` still owns a bounded binary-facing shell above `orchestrator.plan(...)`, so the next truthful nearby move is a dedicated plan CLI shell extraction lane. Evidence: `out/1275-coordinator-symphony-aligned-status-cli-remaining-boundary-freeze-reassessment/manual/20260317T123500Z-closeout/00-summary.md`, `docs/findings/1276-plan-cli-shell-extraction-deliberation.md`.
---

# Technical Specification

## Context

The top-level `plan` command family still owns a bounded shell above the deeper orchestrator plan behavior.

## Requirements

1. Extract the inline `plan` shell without changing user-facing behavior.
2. Preserve help gating, repo-policy application, pipeline/task/stage argument resolution, JSON/text format selection, and `formatPlanPreview(...)` behavior.
3. Keep the deeper orchestrator plan service behavior out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused plan CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
