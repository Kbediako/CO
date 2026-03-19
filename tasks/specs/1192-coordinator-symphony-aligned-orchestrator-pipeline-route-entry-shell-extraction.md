---
id: 20260314-1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Pipeline Route Entry Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md
related_tasks:
  - tasks/tasks-1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Pipeline Route Entry Shell Extraction

## Summary

Extract the remaining `executePipeline(...)` route-entry callback shell from `orchestrator.ts` after `1191` removed the private cloud execution lifecycle shell.

## Scope

- extract the `executePipeline(...)` route-entry callback assembly into a bounded helper
- preserve callback passthrough for `applyRuntimeSelection(...)`, cloud execution, `runAutoScout(...)`, and `startSubpipeline(...)`
- preserve focused regressions for the route-entry shell boundary

## Out of Scope

- route-adapter implementation changes
- route-decision or execution-mode policy behavior
- cloud or local execution lifecycle behavior changes
- public `start()` / `resume()` lifecycle behavior
- broader orchestrator redesign

## Notes

- 2026-03-14: Registered immediately after `1191` closed. The next truthful seam is the remaining route-entry callback envelope in `executePipeline(...)`, not a re-opened route-adapter shell or a broader lifecycle refactor. Evidence: `docs/findings/1192-orchestrator-pipeline-route-entry-shell-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/services/orchestratorExecutionRouteAdapterShell.ts`.
