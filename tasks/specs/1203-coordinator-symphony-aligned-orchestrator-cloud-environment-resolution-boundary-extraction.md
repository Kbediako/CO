---
id: 20260315-1203-coordinator-symphony-aligned-orchestrator-cloud-environment-resolution-boundary-extraction
title: Coordinator Symphony-Aligned Orchestrator Cloud Environment Resolution Boundary Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-environment-resolution-boundary-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-environment-resolution-boundary-extraction.md
related_tasks:
  - tasks/tasks-1203-coordinator-symphony-aligned-orchestrator-cloud-environment-resolution-boundary-extraction.md
review_notes:
  - 2026-03-15: Local read-only review approves the shared cloud environment-id resolution contract as the next truthful Symphony-aligned seam after `1202`. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `orchestrator/src/cli/services/orchestratorCloudRouteShell.ts`, `orchestrator/src/cli/services/orchestratorAutoScoutEvidenceRecorder.ts`, `docs/findings/1203-orchestrator-cloud-environment-resolution-boundary-extraction-deliberation.md`.
---

# Technical Specification

## Context

Cloud environment-id resolution is now the smallest shared behavior surface still hidden inside the executor even though neighboring services already depend on `resolveCloudEnvironmentId(...)` directly.

## Requirements

1. Extract only the shared cloud environment-id resolution contract into one bounded helper/service.
2. Preserve the exact environment-id precedence across target metadata, task metadata, env overrides, and process env.
3. Update executor, cloud-route shell, and auto-scout evidence recorder to consume the shared helper without widening the lane into request shaping or cloud lifecycle behavior.
4. Keep this slice separate from prompt assembly, missing-env handling, and completion helpers already extracted earlier.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run review`
