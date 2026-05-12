---
id: 20260409-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958
title: CO: Make planner memory selection real instead of leaving TaskContext as dead input
status: done
owner: Codex
created: 2026-04-09
last_review: 2026-05-13
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md
related_action_plan: docs/ACTION_PLAN-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md
related_tasks:
  - tasks/tasks-linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958.md
review_notes:
  - 2026-04-09: Opened from Linear issue `CO-92` in the provider-worker workspace after rechecking live CO team states with the packaged `linear issue-context` helper, moving the issue from `Ready` to `In Progress`, recording the required same-turn `stay_serial` / `single_bounded_change` parallelization decision, and switching the detached workspace at `d47f219ef` onto branch `linear/co-92-planner-memory-selection`.
  - 2026-04-09: Pre-implementation audit confirms the current seam is a dead earliest-orchestration input, not a missing manifest contract. `TaskContext` still carries only task identity plus loose metadata, `createTaskContext(...)` only loads id/title/slug, and `CommandPlanner.plan(...)` still discards the task input entirely.
  - 2026-04-09: Adjacent `CO-91` already landed the shared `source 0` contract and helper-backed read path, so this slice stays bounded to planner-memory input, selected ref emission, and downstream cloud-prompt consumption rather than reopening the contract layer.
  - 2026-04-09: Current code audit shows `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts` still performs local prompt-pack experience selection after planning, making it the smallest truthful downstream consumer for this planner-owned selection seam.
  - 2026-05-13: CO-523 live Linear audit verified CO-92 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: out/linear-8573da42-d9f9-44ce-a24e-224984539044/manual/20260512T1850Z-baseline/live-linear-states.json.
---

# Technical Specification

## Context
The repo now has the ingredients for bounded fixed-model memory, but the planner seam is still dead. `source 0` exists as a shared contract, prompt-pack manifests already describe bounded instruction domains, and the cloud prompt path already selects prior experiences heuristically. However, `TaskContext` does not expose a planner-memory contract, `createTaskContext(...)` does not build one, and `CommandPlanner` ignores its task input. The issue is therefore to make the earliest planner seam real and downstream-consumable, not to design a general controller.

## Requirements
1. `TaskContext` must expose a bounded, planner-meaningful memory surface.
2. Run preparation must build that memory surface before `planner.plan(...)`.
3. The planner must consume the task memory and emit selected memory refs in plan metadata.
4. The selected refs must include literal `source 0` when available and a bounded stage-appropriate prompt-pack ref when available.
5. At least one downstream prompt builder must consume the planner-selected refs rather than re-deriving the same decision locally.
6. Planner behavior must differ measurably when planner memory is present vs absent.
7. The change must remain additive and backward-compatible when planner memory or selected refs are absent.
8. The slice must not broaden into controller, scoring, telemetry, continuity, or worker-host parity work.

## Design
- Task contract:
  - extend `TaskContext` with an optional `memory` block
  - store planner-available refs, not full prompt bodies
- Ref shape:
  - stable `id`
  - bounded `kind`
  - human-meaningful `label`
  - optional `domain` or count metadata needed for deterministic selection
- Selection:
  - keep `source_0` as a first-class ref id
  - reuse or generalize existing prompt-pack matching heuristics to choose at most one prompt-pack ref per stage
  - write selected ids into `PlanItem.metadata.selectedMemoryRefs`
- Downstream proof:
  - teach the cloud prompt builder to honor `selectedMemoryRefs` first and use its current heuristics only as the fallback path

## Implementation Surface
- Expected codepaths:
  - `orchestrator/src/types.ts`
  - `orchestrator/src/cli/services/runPreparation.ts`
  - `orchestrator/src/cli/adapters/CommandPlanner.ts`
  - `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - optional bounded shared helper for planner-memory selection or resolution
- Expected tests:
  - planner output differs with vs without planner memory
  - planner-selected refs can drive cloud prompt selection
  - cloud prompt fallback still works when selected refs are absent

## Protected Expectations
- Keep the change additive and bounded.
- Keep literal `source 0` wording.
- Make `TaskContext` materially consumable, not just better documented.
- Preserve the adjacent `CO-91` contract rather than reopening it.

## Reject These Wrong Interpretations
- `TaskContext` already solves the planner-memory problem.
- later prompt-builder work can compensate for a dead planner seam.
- the issue should absorb telemetry, runtime continuity, or worker-host parity work.
- the right fix is a broad planner rewrite.
- planner memory is real if new fields are added but never consumed.

## Current Truth
- `TaskContext` has no explicit planner-memory contract.
- `createTaskContext(...)` only forwards id/title/slug.
- `CommandPlanner.plan(...)` ignores the task parameter.
- the cloud prompt builder still selects experiences heuristically after planning.

## Proposed Design
- Add `TaskContext.memory.refs[]` with bounded refs such as `source_0` and prompt-pack refs.
- Build planner-memory refs during `prepareRun(...)` before plan preview.
- Make `CommandPlanner` emit `selectedMemoryRefs` into per-stage plan metadata when memory is present.
- Update the cloud prompt builder to resolve the selected refs when available.

## Non-Goals
- Final run-memory controller or scoring logic.
- Broad planner redesign.
- Telemetry/status work.
- Resident-session continuity work.
- Distributed worker-host parity work.
- Reopening `0303` or reworking the `CO-91` source-0 contract.

## Parity / Alignment Matrix
- Current truth:
  - `TaskContext` is planner-dead
  - prompt-pack experience selection happens only after planning
  - `source 0` exists, but the planner cannot own it as a selection input
- Reference truth:
  - `CO-91` already provides a bounded shared `source 0` contract
  - existing cloud prompt heuristics already show the exact bounded selection problem
- Target truth / intended delta:
  - planner receives bounded memory refs
  - plan metadata carries selected memory refs
  - downstream cloud prompt building consumes that selection when present
- Explicitly out-of-scope differences:
  - general memory controller
  - non-cloud downstream consumer expansion
  - telemetry, continuity, or parity work

## Not Done If
- `TaskContext` is still effectively ignored by the planner path.
- planner memory selection exists only as comments, dead wiring, or doc claims.
- the seam cannot consume `source 0` and selected memory refs before planning.
- the issue broadens into unrelated telemetry or runtime continuity work.

## Validation Plan
- `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-92-docs-review --format json`
- focused planner-memory and cloud-prompt tests
- `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 node scripts/delegation-guard.mjs`
- `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 node scripts/spec-guard.mjs --dry-run`
- `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 npm run build`
- `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 npm run lint`
- `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 npm run test`
- `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 npm run docs:check`
- `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 npm run docs:freshness`
- `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 node scripts/diff-budget.mjs`
- `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 FORCE_CODEX_REVIEW=1 npm run review`
- `MCP_RUNNER_TASK_ID=linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958 npm run pack:smoke`

## Approvals
- Reviewer: Audited docs-review child stream; no issues found (`.runs/linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958-co-92-docs-review-rerun/cli/2026-04-09T08-44-19-435Z-f73f3b53/manifest.json`)
- Date: 2026-04-09
