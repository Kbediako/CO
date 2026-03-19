---
id: 20260315-1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction
title: Coordinator Symphony-Aligned Orchestrator Resume Pre-Start Failure Persistence Callback Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md
related_tasks:
  - tasks/tasks-1200-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-persistence-callback-extraction.md
review_notes:
  - 2026-03-15: Local read-only review approves the seam. After `1199`, the next truthful extraction is the inline resume pre-start failure persistence callback, not broader control-plane or lifecycle work. Evidence: `docs/findings/1200-orchestrator-resume-pre-start-failure-persistence-callback-extraction-deliberation.md`, `out/1199-coordinator-symphony-aligned-orchestrator-resume-token-validation-extraction/manual/20260314T221044Z-closeout/14-next-slice-note.md`, `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/services/orchestratorControlPlaneLifecycleShell.ts`.
---

# Technical Specification

## Context

The post-`1199` orchestrator entrypoint still owns a cohesive resume pre-start failure persistence callback contract. That contract is the smallest truthful next seam.

## Requirements

1. Extract only the inline resume pre-start failure persistence callback from `orchestrator.ts`.
2. Preserve exact failed-status detail, forced persistence, and warning semantics.
3. Keep public command behavior and control-plane/lifecycle sequencing unchanged.
4. Keep `orchestrator.ts` as the public entrypoint and authority owner.
5. Add focused regression coverage for the extracted callback helper.

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
