---
id: 20260314-1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Plan-Target Tracker Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md
related_tasks:
  - tasks/tasks-1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Plan-Target Tracker Shell Extraction

## Summary

Extract the bounded plan-target tracker shell still embedded in `orchestrator.ts` after `1186` completed the route-adapter shell extraction.

## Scope

- `attachPlanTargetTracker(...)` binding
- the `plan:completed` listener body
- manifest `plan_target_id` mutation plus persist/warn handling
- focused regressions for tracker attachment and `plan_target_id` tracking continuity

## Out of Scope

- `performRunLifecycle(...)`
- public `start()` / `resume()` lifecycle behavior
- `createRunLifecycleTaskManager(...)` registration assembly
- `createOrchestratorRunLifecycleExecutionRegistration(...)`
- route-decision or execution-mode policy helpers
- cloud/local execution shells
- broader control-plane or bootstrap redesign

## Notes

- 2026-03-14: Registered immediately after `1186` closed. The next truthful seam is the remaining tracker shell in `orchestrator.ts`, not another route-adapter lane and not a broader task-manager assembly reopen. Evidence: `docs/findings/1187-orchestrator-plan-target-tracker-shell-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`.
- 2026-03-14: Local read-only review approved this narrower tracker-only boundary: keep `createRunLifecycleTaskManager(...)` as the owner of registration assembly and TaskManager creation, and move only tracker attachment plus persist/warn behavior. Evidence: `docs/findings/1187-orchestrator-plan-target-tracker-shell-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/manager.ts`.
