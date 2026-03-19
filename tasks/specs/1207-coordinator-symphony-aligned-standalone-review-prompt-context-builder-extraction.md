---
id: 20260315-1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction
title: Coordinator Symphony-Aligned Standalone Review Prompt Context Builder Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md
related_tasks:
  - tasks/tasks-1207-coordinator-symphony-aligned-standalone-review-prompt-context-builder-extraction.md
review_notes:
  - 2026-03-15: Local read-only review approves a narrow prompt/context builder extraction in `scripts/run-review.ts`. The remaining dense local seam is the task-context and prompt-support cluster at `scripts/run-review.ts:138-394`, `scripts/run-review.ts:620-732`, and `scripts/run-review.ts:2680-2697`, with existing behavioral lock coverage in `tests/run-review.spec.ts:1191-1285`, `tests/run-review.spec.ts:2263-2392`, and `tests/run-review.spec.ts:4107-4142`. Evidence: `docs/findings/1207-standalone-review-prompt-context-builder-extraction-deliberation.md`, `scripts/run-review.ts`, `tests/run-review.spec.ts`.
---

# Technical Specification

## Context

The runtime and telemetry families of standalone review have already been split into dedicated helpers, but prompt/context support is still inline inside `scripts/run-review.ts`.

## Requirements

1. Extract task index/checklist resolution, task-context assembly, active closeout provenance helpers, and generated NOTES fallback into a dedicated helper under `scripts/lib/`.
2. Extract the prompt scaffold for diff, audit, and architecture surfaces into that helper while preserving the current prompt text and line ordering.
3. Preserve the existing return contract for architecture-surface relevant paths and active closeout bundle roots.
4. Keep runtime selection, scope collection, child-process launch, monitoring, telemetry, and termination boundaries local to `scripts/run-review.ts`.
5. Keep the lane structural: do not widen review-surface behavior beyond the already-tested prompt/context contract.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run tests/run-review.spec.ts`
- `npm run review`
- `npm run pack:smoke`
