---
id: 20260314-1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Orchestration Shell Extraction
status: done
owners:
  - Codex
created: 2026-03-14
last_review: 2026-05-16
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md
related_tasks:
  - tasks/tasks-1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md
review_notes:
  - 2026-05-16: CO-545 strict spec-guard audit reclassified this stale Apr 14/15 row as inactive done; same-file checklist `tasks/tasks-1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md` has 19 checked items and 0 unchecked items, so the old draft status was stale metadata rather than active implementation work.
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Run Lifecycle Orchestration Shell Extraction

## Summary

Extract the remaining run-lifecycle orchestration envelope from `orchestrator.ts` after `1189` removed the last task-manager composition shell.

## Scope

- extract the orchestration owned by `performRunLifecycle(...)` into a bounded service helper
- move or delegate `runLifecycleGuardAndPlanning(...)` and `executeRunLifecycleTask(...)` through the same shell move
- preserve focused regressions for privacy-guard reset, guard short-circuit behavior, run-error ordering, and completion semantics

## Out of Scope

- public `start()` / `resume()` lifecycle behavior
- task-manager composition behavior
- route-decision, routing-policy, or cloud/local execution shells
- control-plane or scheduler implementation changes
- broader orchestrator redesign

## Notes

- 2026-03-14: Registered immediately after `1189` closed. The next truthful seam is the lifecycle envelope around guard/planning, task execution, and completion/error ordering, not another task-manager or routing extraction. Evidence: `docs/findings/1190-orchestrator-run-lifecycle-orchestration-shell-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`.
