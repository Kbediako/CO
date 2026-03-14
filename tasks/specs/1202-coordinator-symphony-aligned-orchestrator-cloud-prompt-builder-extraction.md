---
id: 20260315-1202-coordinator-symphony-aligned-orchestrator-cloud-prompt-builder-extraction
title: Coordinator Symphony-Aligned Orchestrator Cloud Prompt Builder Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-prompt-builder-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-prompt-builder-extraction.md
related_tasks:
  - tasks/tasks-1202-coordinator-symphony-aligned-orchestrator-cloud-prompt-builder-extraction.md
review_notes:
  - 2026-03-15: Local read-only review approves the cloud prompt/domain-selection cluster as the next truthful Symphony-aligned seam after `1201`. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `orchestrator/tests/CloudPrompt.test.ts`, `orchestrator/tests/OrchestratorCloudTargetExecutor.test.ts`, `docs/findings/1157-orchestrator-cloud-target-executor-extraction-deliberation.md`.
---

# Technical Specification

## Context

The cloud executor has already been thinned through earlier same-module helpers, but the prompt/domain-selection behavior still lives inline beside executor ownership. That prompt-builder concern is the remaining bounded behavior seam.

## Requirements

1. Extract only the prompt/domain-selection cluster into one bounded helper or adjacent service.
2. Keep `executeOrchestratorCloudTarget(...)` behavior unchanged outside prompt assembly ownership.
3. Preserve prompt-pack domain precedence, malformed-pack filtering, snippet caps, and final prompt text contract.
4. Keep the lane separate from request-contract, preflight, and completion helpers already extracted earlier.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run review`
