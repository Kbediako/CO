# PRD: Coordinator Symphony-Aligned Doctor Apply Mutation And Readiness Boundary Reassessment

## Summary

After `1249` extracted the `setup` bootstrap shell, the next plausible top-level CLI candidate is the remaining `handleDoctor(...)` readiness plus `--apply` mutation surface in `bin/codex-orchestrator.ts`.

## Problem

`handleDoctor(...)` still owns two mixed concerns in one top-level command block:

- advisory readiness and issue-reporting output
- `--apply` mutation through shared setup modules (`installSkills(...)`, `runDelegationSetup(...)`, `runDevtoolsSetup(...)`)

That may still be too cross-family to justify another immediate extraction, but it is now the most credible remaining top-level CLI candidate after `flow` froze and `setup` moved out.

## Goal

Determine, with current post-`1249` evidence, whether the remaining doctor apply/readiness block contains a truthful bounded seam or should freeze explicitly.

## Non-Goals

- forcing a doctor extraction in this lane
- changing doctor CLI behavior or output
- widening into unrelated command families (`flow`, `setup`, `skills`, `delegation`, `devtools`, `codex`)

## Success Criteria

- current post-`1249` doctor boundary is re-evaluated against the smaller top-level CLI surface
- the result is explicit: `go` for a future bounded extraction lane or `freeze` with rationale
- docs/task mirrors capture the decision without overstating implementation work
