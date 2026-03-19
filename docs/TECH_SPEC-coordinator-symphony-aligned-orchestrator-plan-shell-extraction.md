# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Plan Shell Extraction

- Date: 2026-03-15
- Owner: Codex (top-level agent)
- Task: `1197-coordinator-symphony-aligned-orchestrator-plan-shell-extraction`
- Status: Draft

## Background

`1194`, `1195`, and `1196` reduced the public command surface in `orchestrator.ts` to thinner bounded delegations. The remaining cohesive public command-local preview logic is now the inline `plan()` body.

## Scope

- extract the `plan()` preview shell from `orchestrator.ts` into one bounded helper under `orchestrator/src/cli/services/`
- move or delegate:
  - `prepareRun(...)` preview invocation
  - `planPreview` vs `planner.plan(...)` resolution
  - command-vs-subpipeline stage mapping for the public return payload
  - pipeline source normalization for the preview contract
- preserve the exact preview return shape and current plan semantics

## Out of Scope

- `start()`, `resume()`, or `status()`
- runtime-mode or runtime-selection helpers
- route-adapter or execution-routing helpers
- run-lifecycle or control-plane orchestration
- broader plan payload semantic changes

## Proposed Approach

1. Introduce one bounded plan-shell helper under `orchestrator/src/cli/services/`.
2. Move the `plan()` prepare-and-shape cluster into that helper.
3. Keep `orchestrator.ts` as the public entrypoint while delegating only the plan shell.
4. Add or adapt focused tests around stage mapping, pipeline source normalization, and preview fallback behavior.

## Validation

- standard docs-first guards before implementation
- focused plan-shell regressions during implementation:
  - one new plan-shell test to pin stage mapping and pipeline source normalization
  - adjacent CLI/orchestrator preview coverage that proves the public return contract remains unchanged
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- changing stage payload shape would create visible preview-contract regressions
- widening into lifecycle/routing helpers would break the bounded seam
- mixing preview shaping with broader orchestration concerns would reduce Symphony alignment rather than improve it
