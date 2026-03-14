---
id: 20260314-1195-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Resume Preparation Shell Extraction
status: draft
owner: Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction.md
related_tasks:
  - tasks/tasks-1195-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction.md
review_notes:
  - 2026-03-14: Local read-only review approves the seam. After `1194`, the next truthful extraction is the `resume()` preparation shell before control-plane lifecycle handoff, not a broader public lifecycle refactor. Evidence: `docs/findings/1195-orchestrator-resume-preparation-shell-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`.
---

# Technical Specification

## Context

The post-`1194` orchestrator entrypoint still owns a cohesive `resume()` bootstrap cluster before it delegates into the control-plane lifecycle shell. That cluster is the smallest truthful next seam.

## Requirements

1. Extract only the `resume()` preparation cluster from `orchestrator.ts`.
2. Preserve exact manifest load, resume-token validation, resume-event/reset/heartbeat mutation, `prepareRun`, runtime-mode resolution, plan-target refresh, and persister scheduling.
3. Keep `start()` and downstream lifecycle/run-routing behavior unchanged.
4. Keep `orchestrator.ts` as the public entrypoint and authority owner.
5. Add focused regression coverage for the extracted resume-preparation shell.

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
