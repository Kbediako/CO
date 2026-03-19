---
id: 20260314-1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Control Plane Lifecycle Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-with-control-plane-lifecycle-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-with-control-plane-lifecycle-shell-extraction.md
related_tasks:
  - tasks/tasks-1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Control Plane Lifecycle Shell Extraction

## Summary

Extract the remaining `withControlPlaneLifecycle(...)` control-plane lifecycle shell from `orchestrator.ts` after `1192` removed the route-entry callback shell.

## Scope

- extract the `withControlPlaneLifecycle(...)` envelope into a bounded helper
- preserve control-plane startup failure handling, run-event publisher wiring, and cleanup ordering
- preserve focused regressions for the control-plane lifecycle shell boundary

## Out of Scope

- public `start()` / `resume()` lifecycle behavior
- run-lifecycle orchestration shell behavior
- control-plane validator/service behavior
- route-entry or route-decision behavior
- broader orchestrator redesign

## Notes

- 2026-03-14: Registered immediately after `1192` closed. The next truthful seam is the private control-plane lifecycle shell in `orchestrator.ts`, not another routing slice or a broader public lifecycle refactor. Evidence: `docs/findings/1193-orchestrator-control-plane-lifecycle-shell-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`.
