---
id: 20260315-1206-coordinator-symphony-aligned-orchestrator-cloud-interactive-env-default-fallback-contract
title: Coordinator Symphony-Aligned Orchestrator Cloud Interactive Env Default Fallback Contract
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-interactive-env-default-fallback-contract.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-interactive-env-default-fallback-contract.md
related_tasks:
  - tasks/tasks-1206-coordinator-symphony-aligned-orchestrator-cloud-interactive-env-default-fallback-contract.md
review_notes:
  - 2026-03-15: Local read-only review approves a narrow executor-local fix. The delegated `1205` guard run reproduced a real failure when blank parent interactive env values were forwarded instead of falling back to defaults. Evidence: `.runs/1205-coordinator-symphony-aligned-orchestrator-remaining-shared-cloud-request-contract-reassessment-guard/cli/2026-03-15T01-15-08-231Z-2d90175f/commands/04-test.ndjson`, `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `orchestrator/tests/OrchestratorCloudTargetExecutor.test.ts`, `docs/findings/1206-orchestrator-cloud-interactive-env-default-fallback-contract-deliberation.md`.
---

# Technical Specification

## Context

The cloud executor request builder already normalizes blank optional values in several local request fields, but the three interactive env flags still treat blank strings as explicit values.

## Requirements

1. Normalize blank `CODEX_NON_INTERACTIVE`, `CODEX_NO_INTERACTIVE`, and `CODEX_INTERACTIVE` values to the existing defaults.
2. Preserve explicit nonblank override precedence over process env and defaults.
3. Make the regression deterministic in focused tests by explicitly setting blank parent env values.
4. Keep the lane local to executor request shaping.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npx vitest run orchestrator/tests/OrchestratorCloudTargetExecutor.test.ts`
- `npm run review`
