# TECH SPEC: Coordinator Symphony-Aligned Orchestrator Shared Cloud-Preflight Request Contract Extraction

## Context

`1171` extracted the router-local preflight request assembly into a bounded helper. The remaining drift risk is that `doctor.ts` still shapes cloud-preflight requests independently, so the same `runCloudPreflight(...)` contract can diverge across shells.

## Scope

- align router and doctor on a shared cloud-preflight request contract
- preserve caller-specific higher-level decisions in each shell
- add focused coverage for the shared request contract where it becomes independently meaningful

## Out of Scope

- changes to `runCloudPreflight(...)` semantics
- router fallback or fail-fast policy changes
- doctor-specific guidance/report formatting changes
- unrelated cloud executor refactors

## Proposed Design

1. Introduce a bounded shared contract/helper for shaping `runCloudPreflight(...)` inputs.
2. Keep router-local decisions in `orchestratorExecutionRouter.ts` and doctor-local decisions in `doctor.ts`.
3. Preserve explicit caller-owned resolution of any inputs that are not yet truthfully shareable.
4. Extend focused tests only around the shared contract and immediate call sites.

## Validation

- focused router/doctor regression coverage
- normal docs-first guard bundle
- bounded standalone review on the shared contract seam
