---
id: 20260314-1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract
title: Coordinator Symphony-Aligned Orchestrator Execution-Routing Fallback Manifest Contract
status: completed
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md
related_tasks:
  - tasks/tasks-1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Execution-Routing Fallback Manifest Contract

## Summary

Narrow the remaining cloud-preflight failure contract inside `orchestratorExecutionRouter.ts` after the broader `1169` router-local policy split.

## Scope

- router-local hard-fail versus fallback manifest/error-note shaping
- hard-fail versus recursive fallback contract preservation
- focused router regressions

## Out of Scope

- broad router extraction already completed in `1169`
- `orchestrator.ts` or lifecycle/executor refactors
- runtime/provider policy changes

## Notes

- 2026-03-14: Registered immediately after `1169` closed. The truthful remaining seam is the cloud fallback manifest/error-note contract inside `orchestratorExecutionRouter.ts`, not another broad routing extraction. Evidence: `docs/findings/1170-orchestrator-execution-routing-fallback-manifest-contract-deliberation.md`.
- 2026-03-14: Closed with a data-only cloud-preflight failure contract helper in `orchestratorExecutionRouter.ts`, focused router-adjacent regressions `24/24`, bounded review no findings, `pack:smoke` pass, and an explicit final-tree `npm run test` quiet-tail override after `tests/cli-orchestrator.spec.ts` completed. Evidence: `out/1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract/manual/20260314T015844Z-closeout/00-summary.md`.
