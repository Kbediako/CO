---
id: 20260314-1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation
title: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Tracker Delegation
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md
related_tasks:
  - tasks/tasks-1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Tracker Delegation

## Summary

Remove the remaining local tracker wrapper from `orchestrator.ts` now that `1187` already extracted the tracker behavior into `orchestratorPlanTargetTracker.ts`.

## Scope

- remove `attachPlanTargetTracker(...)` from `orchestrator.ts`
- delegate directly to `attachOrchestratorPlanTargetTracker(...)` from `createRunLifecycleTaskManager(...)`
- preserve focused regressions for attach-on-success and no-attach-on-failure behavior

## Out of Scope

- tracker helper behavior changes
- `performRunLifecycle(...)`
- public `start()` / `resume()` lifecycle behavior
- `createRunLifecycleTaskManager(...)` registration assembly
- route-decision or execution-mode policy helpers
- cloud/local execution shells
- broader lifecycle or control-plane redesign

## Notes

- 2026-03-14: Registered immediately after `1187` closed. The next truthful seam is the remaining local wrapper between `createRunLifecycleTaskManager(...)` and `attachOrchestratorPlanTargetTracker(...)`, not a broader task-manager shell reopen. Evidence: `docs/findings/1188-orchestrator-run-lifecycle-task-manager-tracker-delegation-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/services/orchestratorPlanTargetTracker.ts`.
