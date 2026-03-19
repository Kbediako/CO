---
id: 20260315-1197-coordinator-symphony-aligned-orchestrator-plan-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Plan Shell Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-plan-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-plan-shell-extraction.md
related_tasks:
  - tasks/tasks-1197-coordinator-symphony-aligned-orchestrator-plan-shell-extraction.md
review_notes:
  - 2026-03-15: Local read-only review approves the seam. After `1196`, the next truthful extraction is the inline `plan()` preview shell, not a broader lifecycle or routing refactor. Evidence: `docs/findings/1197-orchestrator-plan-shell-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`.
---

# Technical Specification

## Context

The post-`1196` orchestrator entrypoint still owns a cohesive read-only `plan()` preview cluster. That cluster is the smallest truthful next seam.

## Requirements

1. Extract only the `plan()` preview cluster from `orchestrator.ts`.
2. Preserve exact `prepareRun(...)` usage, `planPreview` fallback behavior, stage mapping semantics, pipeline source normalization, and public return shape.
3. Keep `start()`, `resume()`, `status()`, and lifecycle/routing behavior unchanged.
4. Keep `orchestrator.ts` as the public entrypoint and authority owner.
5. Add focused regression coverage for the extracted plan shell.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
