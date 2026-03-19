---
id: 20260315-1196-coordinator-symphony-aligned-orchestrator-status-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Status Shell Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-status-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-status-shell-extraction.md
related_tasks:
  - tasks/tasks-1196-coordinator-symphony-aligned-orchestrator-status-shell-extraction.md
review_notes:
  - 2026-03-15: Local read-only review approves the seam. After `1195`, the next truthful extraction is the `status()` command shell plus `buildStatusPayload(...)` and `renderStatus(...)`, not a broader command-surface refactor. Evidence: `docs/findings/1196-orchestrator-status-shell-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`.
---

# Technical Specification

## Context

The post-`1195` orchestrator entrypoint still owns a cohesive read-only `status()` command cluster. That cluster is the smallest truthful next seam.

## Requirements

1. Extract only the `status()` command cluster from `orchestrator.ts`.
2. Preserve exact manifest load, runtime activity lookup, JSON payload shape, and text rendering behavior.
3. Keep `start()`, `resume()`, `plan()`, and lifecycle orchestration behavior unchanged.
4. Keep `orchestrator.ts` as the public entrypoint and authority owner.
5. Add focused regression coverage for the extracted status shell.

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
