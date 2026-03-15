---
id: 20260315-1205-coordinator-symphony-aligned-orchestrator-remaining-shared-cloud-request-contract-reassessment
title: Coordinator Symphony-Aligned Orchestrator Remaining Shared Cloud Request-Contract Reassessment
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-remaining-shared-cloud-request-contract-reassessment.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-remaining-shared-cloud-request-contract-reassessment.md
related_tasks:
  - tasks/tasks-1205-coordinator-symphony-aligned-orchestrator-remaining-shared-cloud-request-contract-reassessment.md
review_notes:
  - 2026-03-15: Local read-only review approves a reassessment-first lane here. Shared environment-id and branch contracts are already first-class, and the remaining nearby surfaces appear to be distinct preflight, execution, and evidence responsibilities rather than one truthful shared request contract. Evidence: `orchestrator/src/cli/services/orchestratorCloudEnvironmentResolution.ts`, `orchestrator/src/cli/services/orchestratorCloudBranchResolution.ts`, `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `orchestrator/src/cli/services/orchestratorCloudRouteShell.ts`, `orchestrator/src/cli/services/orchestratorAutoScoutEvidenceRecorder.ts`, `orchestrator/src/cli/utils/cloudPreflight.ts`, `docs/findings/1205-orchestrator-remaining-shared-cloud-request-contract-reassessment-deliberation.md`.
---

# Technical Specification

## Context

The neighboring cloud family has already had its two obvious shared resolution contracts extracted. The remaining local surfaces must be reassessed before another extraction lane is opened.

## Requirements

1. Reinspect only the remaining shared cloud request-contract density around the executor, cloud-route shell, auto-scout recorder, and preflight helper.
2. Record whether any remaining cross-surface request fields still justify extraction.
3. Keep generic numeric/default parsing, feature toggles, doctor coupling, and evidence-only payload details out of scope unless new evidence proves they belong to one truthful contract.
4. Close the lane honestly as either one bounded next seam or an explicit no-op reassessment.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run review`
