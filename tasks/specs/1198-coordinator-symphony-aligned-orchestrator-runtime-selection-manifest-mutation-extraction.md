---
id: 20260315-1198-coordinator-symphony-aligned-orchestrator-runtime-selection-manifest-mutation-extraction
title: Coordinator Symphony-Aligned Orchestrator Runtime Selection Manifest Mutation Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-runtime-selection-manifest-mutation-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-runtime-selection-manifest-mutation-extraction.md
related_tasks:
  - tasks/tasks-1198-coordinator-symphony-aligned-orchestrator-runtime-selection-manifest-mutation-extraction.md
review_notes:
  - 2026-03-15: Local read-only review approves the seam. After `1197`, the next truthful extraction is the shared runtime-manifest mutation pair, not broader runtime-resolution or lifecycle logic. Evidence: `docs/findings/1198-orchestrator-runtime-selection-manifest-mutation-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`, `out/1197-coordinator-symphony-aligned-orchestrator-plan-shell-extraction/manual/20260314T172452Z-closeout/14-next-slice-note.md`.
---

# Technical Specification

## Context

The post-`1197` orchestrator entrypoint still owns a cohesive shared runtime-manifest mutation pair. That pair is the smallest truthful next seam.

## Requirements

1. Extract only the shared runtime-manifest mutation pair from `orchestrator.ts`.
2. Preserve exact mutation behavior for requested mode, selected mode, runtime provider, and runtime fallback fields.
3. Keep runtime resolution logic, public command behavior, and lifecycle/routing behavior unchanged.
4. Keep `orchestrator.ts` as the public entrypoint and authority owner.
5. Add focused regression coverage for the extracted mutation helper.

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
