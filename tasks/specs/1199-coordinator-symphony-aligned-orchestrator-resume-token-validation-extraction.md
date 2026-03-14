---
id: 20260315-1199-coordinator-symphony-aligned-orchestrator-resume-token-validation-extraction
title: Coordinator Symphony-Aligned Orchestrator Resume Token Validation Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-resume-token-validation-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-resume-token-validation-extraction.md
related_tasks:
  - tasks/tasks-1199-coordinator-symphony-aligned-orchestrator-resume-token-validation-extraction.md
review_notes:
  - 2026-03-15: Local read-only review approves the seam. After `1198`, the next truthful extraction is the real `validateResumeToken(...)` contract, not broader resume preparation or lifecycle work. Evidence: `docs/findings/1199-orchestrator-resume-token-validation-extraction-deliberation.md`, `out/1198-coordinator-symphony-aligned-orchestrator-runtime-selection-manifest-mutation-extraction/manual/20260314T214951Z-closeout/14-next-slice-note.md`, `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts`.
---

# Technical Specification

## Context

The post-`1198` orchestrator entrypoint still owns a cohesive resume-token validation contract. That contract is the smallest truthful next seam.

## Requirements

1. Extract only the real `validateResumeToken(...)` behavior from `orchestrator.ts`.
2. Preserve exact file-read, missing-token, and mismatch semantics.
3. Keep runtime-selection behavior, public command behavior, and lifecycle/routing behavior unchanged.
4. Keep `orchestrator.ts` as the public entrypoint and authority owner.
5. Add focused regression coverage for the extracted resume-token validation helper.

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
