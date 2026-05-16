---
id: 20260314-1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Shell Extraction
status: done
owners:
  - Codex
created: 2026-03-14
last_review: 2026-05-16
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md
related_tasks:
  - tasks/tasks-1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md
review_notes:
  - 2026-05-16: CO-545 strict spec-guard audit reclassified this stale Apr 14/15 row as inactive done; same-file checklist `tasks/tasks-1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md` has 19 checked items and 0 unchecked items, so the old draft status was stale metadata rather than active implementation work.
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Shell Extraction

## Summary

Extract the remaining task-manager composition shell from `orchestrator.ts` after `1188` removed the last local tracker wrapper.

## Scope

- extract `createRunLifecycleTaskManager(...)` into a bounded service helper
- remove the local `createTaskManager(...)` forwarding wrapper
- preserve focused regressions for manager creation plus tracker attachment behavior

## Out of Scope

- `performRunLifecycle(...)`
- public `start()` / `resume()` lifecycle behavior
- routing policy helpers
- cloud/local execution shells
- execution-registration, route-adapter, or tracker-helper behavior changes

## Notes

- 2026-03-14: Registered immediately after `1188` closed. The next truthful seam is the remaining task-manager composition and its local forwarding wrapper, not a broader lifecycle or routing change. Evidence: `docs/findings/1189-orchestrator-run-lifecycle-task-manager-shell-extraction-deliberation.md`, `orchestrator/src/cli/orchestrator.ts`.
