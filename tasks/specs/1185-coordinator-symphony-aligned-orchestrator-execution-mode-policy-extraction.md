---
id: 20260314-1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction
title: Coordinator Symphony-Aligned Orchestrator Execution Mode Policy Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md
related_tasks:
  - tasks/tasks-1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Execution Mode Policy Extraction

## Summary

Extract the bounded execution-mode policy block still held inside `orchestratorExecutionRouter.ts`.

## Scope

- `requiresCloudOrchestratorExecution(...)`
- `determineOrchestratorExecutionMode(...)`
- thin router re-export/import preservation
- focused regressions for unchanged execution-mode policy semantics

## Out of Scope

- route decision shell behavior
- route-state assembly or runtime selection
- cloud/local route shell internals
- orchestrator executor lifecycle behavior

## Notes

- 2026-03-14: Registered immediately after `1184` closed. The next truthful remaining router-local seam is execution-mode policy, not another route-decision or executor refactor. Evidence: `docs/findings/1185-orchestrator-execution-mode-policy-extraction-deliberation.md`, `out/1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction/manual/20260314T093516Z-closeout/14-next-slice-note.md`.
- 2026-03-14: Local read-only review approval for the docs-first packet is captured in the deliberation note and mirrored checklist. Evidence: `docs/findings/1185-orchestrator-execution-mode-policy-extraction-deliberation.md`, `tasks/tasks-1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction.md`.
