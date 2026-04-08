---
id: 20260308-1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction
title: Coordinator Symphony-Aligned Standalone Review Execution State Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Execution State Extraction

- Task ID: `1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md`

## Scope

- Extract a single review execution state/monitor owner from `scripts/run-review.ts`.
- Route runtime enforcement and telemetry projection through that shared state.
- Keep the wrapper shell thin and preserve the artifact-first contract.

## Files / Modules

- `scripts/run-review.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`
- `docs/AGENTS.md`
- review artifacts under `.runs/.../review/` (behavioral evidence only)

## Design

1. Add a dedicated `ReviewExecutionState` or `ReviewMonitor` module adjacent to `scripts/run-review.ts`.
2. Feed stdout/stderr chunks into that module once.
3. Expose typed snapshot/projector helpers for:
   - startup-loop state
   - timeout/stall state
   - progress/checkpoint status
   - telemetry persistence payloads
   - failure summary payloads
4. Refactor `scripts/run-review.ts` so it orchestrates:
   - prompt construction
   - runtime selection
   - child process launch/retry policy
   - final artifact writes
   while delegating live execution-state tracking to the extracted module.
5. Add direct snapshot/projection tests so the extracted state owner can be validated independently from the full wrapper.

## Risks / Guardrails

- Do not change the downstream review artifact contract unless the docs are updated in the same slice.
- Do not hide policy decisions behind the new state owner; it should be an execution-state authority, not a new policy layer.
- Preserve non-interactive handoff semantics, bounded review guidance, and heavy-command controls unless explicitly revised in docs.
- Keep the slice structural and narrow; do not combine it with unrelated `run-review` feature work.

## Acceptance Criteria

- The wrapper uses one runtime state owner for enforcement and telemetry.
- The new module has direct tests for snapshot/projection behavior.
- Existing `tests/run-review.spec.ts` coverage remains green.
- Docs stay aligned with the shipped wrapper behavior.

## Validation

- Targeted `tests/run-review.spec.ts`.
- New direct unit tests for review execution state/projections.
- Standard validation lane for review-wrapper/docs paths, including `pack:smoke`.

## Review Notes

- 2026-03-08 local review of `scripts/run-review.ts`, `0979`, and recent `1055`/`1056` closeouts identified the remaining reliability gap as split runtime authority: live enforcement state plus post-hoc telemetry reparsing.
- 2026-03-08 real Symphony read-only research found no direct review-wrapper analogue, but it did validate the structural lesson of one state owner plus thin controller/projection layers.
