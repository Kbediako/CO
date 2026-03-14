---
id: 20260314-1186-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Execution Route Adapter Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction.md
related_tasks:
  - tasks/tasks-1186-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Execution Route Adapter Shell Extraction

## Summary

Extract the bounded route-adapter shell still embedded in `orchestrator.ts`.

## Scope

- `createTaskManager(...)`
- `executePipeline(...)`
- route-adapter wiring passed into `createRunLifecycleTaskManager(...)`
- focused routing regressions for unchanged adapter behavior

## Out of Scope

- `performRunLifecycle(...)`
- resume/start orchestration
- lifecycle registration or manifest bootstrapping
- router policy helpers
- cloud/local route shell internals

## Notes

- 2026-03-14: Registered immediately after `1185` closed. The next truthful remaining routing seam is the route-adapter shell in `orchestrator.ts`, not a broader run-lifecycle refactor. Evidence: `docs/findings/1186-orchestrator-execution-route-adapter-shell-extraction-deliberation.md`, `out/1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction/manual/20260314T102111Z-closeout/14-next-slice-note.md`.
- 2026-03-14: Local read-only review approval for the docs-first packet is captured in the deliberation note and mirrored checklist. Evidence: `docs/findings/1186-orchestrator-execution-route-adapter-shell-extraction-deliberation.md`, `tasks/tasks-1186-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction.md`.
