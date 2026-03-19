---
id: 20260315-1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction
title: Coordinator Symphony-Aligned Orchestrator Cloud Branch Resolution Boundary Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md
related_tasks:
  - tasks/tasks-1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md
review_notes:
  - 2026-03-15: Local read-only review approves the shared cloud branch-resolution contract as the next truthful Symphony-aligned seam after `1203`. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `orchestrator/src/cli/services/orchestratorCloudRouteShell.ts`, `orchestrator/src/cli/services/orchestratorAutoScoutEvidenceRecorder.ts`, `docs/findings/1204-orchestrator-cloud-branch-resolution-boundary-extraction-deliberation.md`.
---

# Technical Specification

## Context

Cloud branch precedence is now the smallest shared cloud behavior still duplicated across neighboring services after `1203` extracted the shared environment-id contract.

## Requirements

1. Extract only the shared cloud branch-resolution contract into one bounded helper/service.
2. Preserve the exact branch precedence across env overrides and process env.
3. Update the cloud executor, cloud-route shell, and auto-scout evidence recorder to consume the shared helper without widening the lane into request shaping or cloud lifecycle behavior.
4. Keep this slice separate from shared environment-id resolution, prompt assembly, and completion helpers already extracted earlier.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run review`
