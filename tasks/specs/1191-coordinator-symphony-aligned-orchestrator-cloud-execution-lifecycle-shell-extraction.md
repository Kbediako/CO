---
id: 20260314-1191-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Cloud Execution Lifecycle Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md
related_tasks:
  - tasks/tasks-1191-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Cloud Execution Lifecycle Shell Extraction

## Summary

Extract the remaining private cloud execution lifecycle shell from `orchestrator.ts` after `1190` removed the run-lifecycle orchestration envelope.

## Scope

- extract the `executeCloudPipeline(...)` / `runCloudExecutionLifecycleShell(...)` orchestration into a bounded service helper
- preserve `runAutoScout`, `advancedDecisionEnv`, failure-detail forwarding, note ordering, and event/persister passthrough
- preserve focused regressions for the extracted cloud lifecycle boundary

## Out of Scope

- route-decision or execution-mode policy behavior
- public `start()` / `resume()` lifecycle behavior
- local execution lifecycle behavior
- cloud target executor logic changes
- broader orchestrator redesign

## Notes

- 2026-03-14: Registered immediately after `1190` closed. The next truthful seam is the remaining private cloud execution lifecycle shell in `orchestrator.ts`, not a broader public lifecycle or routing extraction. Evidence: `docs/findings/1191-orchestrator-cloud-execution-lifecycle-shell-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`.
