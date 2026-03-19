# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Runtime Selection Manifest Mutation Extraction

- Date: 2026-03-15
- Owner: Codex (top-level agent)
- Task: `1198-coordinator-symphony-aligned-orchestrator-runtime-selection-manifest-mutation-extraction`
- Status: Draft

## Background

`1194` through `1197` reduced `orchestrator.ts` to thin public command-local delegations plus a smaller set of shared private helpers. The remaining shared runtime-manifest mutation pair is now the smallest truthful extraction seam.

## Scope

- extract the shared runtime-manifest mutation pair from `orchestrator.ts` into one bounded helper under `orchestrator/src/cli/services/`
- move or delegate:
  - requested runtime-mode manifest mutation
  - runtime-selection manifest mutation
- preserve exact mutation semantics for:
  - `runtime_mode_requested`
  - `runtime_mode`
  - `runtime_provider`
  - `runtime_fallback`

## Out of Scope

- runtime mode resolution logic itself
- runtime selection logic itself
- `validateResumeToken(...)`
- public `start()`, `resume()`, `status()`, or `plan()` shell behavior
- route-adapter or run-lifecycle orchestration

## Proposed Approach

1. Introduce one bounded runtime-manifest mutation helper under `orchestrator/src/cli/services/`.
2. Move the requested-mode and selected-mode mutation logic into that helper.
3. Keep `orchestrator.ts` as the public entrypoint while delegating only the shared mutation pair.
4. Rewire the existing start/resume/route-state helpers to consume the extracted mutation helper contract.
5. Add or adapt focused tests around requested-mode mutation and runtime-selection mutation behavior.

## Validation

- standard docs-first guards before implementation
- focused mutation-helper regressions during implementation:
  - requested runtime-mode mutation
  - runtime-selection mutation
  - adjacent start/resume/route-state behavior staying unchanged
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- changing fallback/provider mutation semantics would create subtle runtime-status regressions
- widening into runtime resolution logic would break the bounded seam
- splitting the helper too broadly would reduce symmetry with the existing extracted service surfaces
