---
id: 20260314-1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Execution Routing Decision Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction.md
related_tasks:
  - tasks/tasks-1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Execution Routing Decision Shell Extraction

## Summary

Extract the bounded execution-routing decision shell still shaped inline in `orchestratorExecutionRouter.ts`.

## Scope

- runtime-selection fail-fast behavior in the routing shell
- cloud versus local route branching
- fallback-adjusted forwarding into the already-extracted route shells
- focused regressions for routing fail-fast behavior, branching, and forwarding

## Out of Scope

- route-state assembly or runtime selection
- cloud-route shell internals
- local-route shell internals
- cloud-preflight request assembly or fallback contract shaping
- successful cloud pipeline dispatch or broader executor lifecycle behavior

## Notes

- 2026-03-14: Registered immediately after `1183` closed. The next truthful remaining routing seam is the execution-routing decision shell still embedded in `orchestratorExecutionRouter.ts`, not another cloud/local shell internal refactor. Evidence: `docs/findings/1184-orchestrator-execution-routing-decision-shell-extraction-deliberation.md`, `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/20260314T085358Z-closeout/14-next-slice-note.md`.
- 2026-03-14: Local read-only review approval for the docs-first packet is captured in the deliberation note and mirrored checklist. Evidence: `docs/findings/1184-orchestrator-execution-routing-decision-shell-extraction-deliberation.md`, `tasks/tasks-1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction.md`.
