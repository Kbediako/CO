---
id: 20260409-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d
title: CO: Add run memory controller with role-specific retrieval profiles
relates_to: docs/PRD-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md
risk: high
owners:
  - Codex
last_review: 2026-04-13
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`
- PRD: `docs/PRD-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`
- Task checklist: `tasks/tasks-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`

## Traceability
- Linear issue: `CO-94` / `ce6f26d0-029a-40d9-8ffe-289cd40cde8d`
- Linear URL: https://linear.app/asabeko/issue/CO-94/add-run-memory-controller-with-role-specific-retrieval-profiles
- Follow-up to: `CO-89` / `70e83230-4f52-4850-b494-41fd0ec32f13`
- Depends on landed anchor slice: `CO-91` / `5f850884-855f-41ed-b593-6c2dee5815d2`

## Summary
- Objective: add a shared `run memory controller` that turns existing run memory sources into role-specific selections with structured refs and provenance.
- Scope:
  - introduce one controller/helper layer above `source0.ts`
  - encode bounded role profiles for `planner`, `reviewer`, `executor`, and `delegate`
  - wire planner, reviewer, and at least one executor/delegate consumer path to the controller
  - add focused tests that prove role-specific differences and shared-consumer adoption
- Constraints:
  - no new storage or block-memory lifecycle work
  - no retrieval indexing/performance or generalized reuse expansion
  - no runtime continuity, telemetry, or distributed-host parity expansion

## Implementation Boundary
- New controller module:
  - add a helper module such as `runMemoryController.ts` under `orchestrator/src/cli/run/`
  - parse manifest-backed run memory inputs (`memory.source_0`, existing prompt-pack metadata)
  - return structured candidate refs plus role/profile metadata
- Consumer wiring:
  - reviewer: `scripts/lib/review-prompt-context.ts`
  - planner: symbolic RLM planner prompt path in `orchestrator/src/cli/rlm/symbolic.ts`, with any manifest-read bridge kept thin in `orchestrator/src/cli/rlmRunner.ts`
  - executor/delegate: at minimum `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`; provider-worker and child-lane should also migrate when the diff stays small
- Lower-level seams that remain intact:
  - `orchestrator/src/cli/run/source0.ts` still owns source-anchor parsing/resolution
  - manifest schema/types remain unchanged unless implementation proves a missing controller artifact contract

## Design
- Controller inputs:
  - raw manifest or manifest-like JSON
  - target role/profile
  - optional hint text used only for prompt-pack domain matching
- Controller output:
  - `role`
  - `profile`
  - ordered `refs[]` where each ref is structured and provenance-rich
  - prompt rendering remains a thin derived helper layered on top of `refs[]`
- Candidate kinds for this slice:
  - `source_0` backed by `memory.source_0`
  - prompt-pack experience refs backed by existing manifest `prompt_packs[].experiences`
- Initial profile expectations:
  - `planner`: `source_0` plus bounded prompt-pack experience refs
  - `reviewer`: `source_0` only unless future evidence proves reviewer-specific extra refs are needed
  - `executor`: `source_0` plus bounded prompt-pack experience refs
  - `delegate`: at minimum `source_0`, staying narrower than `executor`

## Validation
- audited `linear child-stream --pipeline docs-review`
- focused tests for:
  - controller ref selection and role-specific profile differences
  - reviewer consumer wiring
  - planner consumer wiring
  - at least one executor or delegate consumer wiring
- full repo validation floor before review handoff

## Approvals
- Reviewer: Pre-implementation local self-review approved; audited `docs-review` child stream recorded at `.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d-co-94-docs-review/cli/2026-04-09T08-52-01-943Z-a900f3f5/manifest.json` (`clean-success` telemetry, plus one late surfaced checklist-header P2 fixed in the packet). Current-base validation completed during the 2026-04-13 UTC run after moving `CO-94` back to `In Progress`, merging current `origin/main`, running the full validation floor green, and recording a manual review/elegance fallback after the wrapper classified a `failed-boundary` command-intent stop.
- Date: 2026-04-13 UTC
