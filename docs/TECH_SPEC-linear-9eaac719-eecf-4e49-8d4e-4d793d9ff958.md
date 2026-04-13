---
id: 20260409-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958
title: CO: Make planner memory selection real instead of leaving TaskContext as dead input
relates_to: docs/PRD-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`
- PRD: `docs/PRD-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`
- Task checklist: `tasks/tasks-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md`

## Traceability
- Linear issue: `CO-92` / `9eaac719-eecf-4e49-8d4e-4d793d9ff958`
- Linear URL: https://linear.app/asabeko/issue/CO-92/make-planner-memory-selection-real-instead-of-leaving-taskcontext-as
- Follow-up to: `CO-89` / `70e83230-4f52-4850-b494-41fd0ec32f13`
- Depends on adjacent `source 0` contract slice: `CO-91` / `5f850884-855f-41ed-b593-6c2dee5815d2`

## Summary
- Objective: make the earliest orchestration step expose and consume bounded planner memory so `TaskContext` is no longer dead input and the planner emits selected memory refs before downstream prompt builders run.
- Scope:
  - extend `TaskContext` with a bounded planner-memory contract
  - build planner-memory refs during run preparation
  - make `CommandPlanner` emit selected memory refs in plan item metadata
  - make the cloud prompt path consume planner-selected refs when present
  - add focused tests for planner present-vs-absent behavior and downstream consumption
- Constraints:
  - no broad planner rewrite
  - no run-memory controller or scoring logic
  - no telemetry, continuity, or worker-host parity expansion

## Implementation Boundary
- Task context:
  - add a new optional planner-memory surface to `TaskContext`
  - keep it small, reference-based, and serializable
- Run preparation:
  - derive planner-available refs before `planner.plan(...)`
  - advertise literal `source 0` plus bounded prompt-pack refs rather than full prompt content
- Planner:
  - stop treating the task input as unused
  - emit selected memory refs in plan item metadata using a stable key
  - keep selection deterministic and bounded
- Downstream consumer:
  - update `orchestratorCloudPromptBuilder.ts` to prefer planner-selected refs and fall back safely when absent

## Design
- `TaskContext.memory` shape:
  - `refs[]` list of planner-available refs
  - stable `id` per ref such as `source_0` or `prompt_pack:<id>`
  - minimal ref metadata such as `kind`, `label`, `domain`, and bounded counts
- Planner selection:
  - always preserve literal `source 0` when available
  - select at most one prompt-pack ref per stage using the existing stage or pipeline matching heuristics
  - write the selected ids into `PlanItem.metadata.selectedMemoryRefs`
- Prompt-builder consumption:
  - source-0 prompt lines are included when `selectedMemoryRefs` explicitly includes `source_0`
  - prompt-pack experiences are resolved from the selected ref ids when present
  - if no planner-selected refs exist, existing cloud prompt heuristics remain the compatibility path

## Validation
- audited `linear child-stream --pipeline docs-review`
- focused tests for:
  - planner output differing with vs without `TaskContext.memory`
  - cloud prompt consumption of planner-selected refs
  - backwards-compatible cloud prompt fallback when planner-selected refs are absent
- full repo validation floor before review handoff

## Approvals
- Reviewer: Pending audited docs-review child stream after packet creation
- Date: 2026-04-09
