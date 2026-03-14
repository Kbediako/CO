---
id: 20260314-1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Start Preparation Shell Extraction
status: draft
owner: Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md
related_tasks:
  - tasks/tasks-1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md
review_notes:
  - 2026-03-14: Local read-only review approves the seam. After `1193`, the next truthful extraction is the `start()` preparation shell before control-plane lifecycle handoff, not a broader public lifecycle refactor. Evidence: `docs/findings/1194-orchestrator-start-preparation-shell-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`.
---

# Technical Specification

## Context

The post-`1193` orchestrator entrypoint still owns a cohesive `start()` bootstrap cluster before it delegates into the control-plane lifecycle shell. That cluster is the smallest truthful next seam.

## Requirements

1. Extract only the `start()` preparation cluster from `orchestrator.ts`.
2. Preserve exact `prepareRun`, run id, runtime-mode, manifest bootstrap, summary application, and persister wiring.
3. Keep `resume()` and downstream lifecycle/run-routing behavior unchanged.
4. Keep `orchestrator.ts` as the public entrypoint and authority owner.
5. Add focused regression coverage for the extracted start-preparation shell.

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
