---
id: 20260314-1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction
title: Coordinator Symphony-Aligned Orchestrator Execution Route State Assembly Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md
related_tasks:
  - tasks/tasks-1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Execution Route State Assembly Extraction

## Summary

Extract the shared route-state assembly still shaped inline in `resolveExecutionRouteState(...)` in `orchestratorExecutionRouter.ts`.

## Scope

- bounded shared route-state assembly around `resolveExecutionRouteState(...)`
- preservation of env merge, runtime selection invocation, manifest application, and effective env assembly
- focused regressions for runtime selection invocation, manifest application, and env precedence

## Out of Scope

- cloud preflight request or fallback policy changes
- cloud or local lifecycle shell changes
- runtime provider internals
- local or cloud executor internals
- broader router refactors beyond the shared route-state assembly seam

## Notes

- 2026-03-14: Registered immediately after `1179` closed. The next truthful shared risk is the route-state assembly cluster in `resolveExecutionRouteState(...)` in `orchestratorExecutionRouter.ts`, not another lifecycle-shell or cloud-fallback extraction. Evidence: `docs/findings/1180-orchestrator-execution-route-state-assembly-extraction-deliberation.md`, `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/20260314T062139Z-closeout/14-next-slice-note.md`.
- 2026-03-14: Local read-only review approval for the docs-first packet is captured in the deliberation note and mirrored checklist. Evidence: `docs/findings/1180-orchestrator-execution-route-state-assembly-extraction-deliberation.md`, `tasks/tasks-1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md`.
- 2026-03-14: `docs-review` did not reach a diff-local review step for the registration packet; the pipeline failed at `Run delegation guard`, so the docs-first lane records an explicit override backed by direct local `spec-guard`, `docs:check`, and `docs:freshness` passes plus the run manifest `.runs/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/cli/2026-03-14T06-43-44-708Z-fd55f08b/manifest.json`.
