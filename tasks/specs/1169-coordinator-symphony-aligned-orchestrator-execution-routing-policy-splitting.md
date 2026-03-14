---
id: 20260314-1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting
title: Coordinator Symphony-Aligned Orchestrator Execution-Routing Policy Splitting
status: completed
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md
related_tasks:
  - tasks/tasks-1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Execution-Routing Policy Splitting

## Summary

Split the remaining routing-policy cluster inside `routeOrchestratorExecution(...)` into smaller helpers, keeping the already-extracted router shell intact.

## Scope

- router-local policy helpers for runtime selection, cloud preflight/fallback, and local routing
- thin `executePipeline()` adapter boundary in `orchestrator.ts`
- focused router regression coverage

## Out of Scope

- broad router extraction already done in `1159`
- execution lifecycle or executor body changes
- public `start()` / `resume()` refactors

## Notes

- 2026-03-14: Registered after `1168` completed. The next truthful seam is the internal policy split inside `routeOrchestratorExecution(...)`, not another broad execution-routing extraction. Evidence: `docs/findings/1169-orchestrator-execution-routing-policy-splitting-deliberation.md`.
- 2026-03-14: Closed with router-local helper extraction in `orchestratorExecutionRouter.ts`, focused router regressions `24/24`, full-suite terminal pass `216/216` files and `1495/1495` tests, bounded review no findings, and `pack:smoke` pass. Evidence: `out/1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting/manual/20260314T011615Z-closeout/00-summary.md`.
