# 1197 Deliberation - Orchestrator Plan Shell Extraction

## Decision

Open `1197-coordinator-symphony-aligned-orchestrator-plan-shell-extraction` as the next bounded Symphony-aligned lane after `1196`.

## Why This Seam

After `1196`, `status()` now delegates through a bounded helper. The remaining cohesive public command-local orchestration in `orchestrator.ts` is now the inline `plan()` preview path.

That cluster is cohesive and bounded:

- `prepareRun(...)` invocation for preview mode
- `planPreview` vs `planner.plan(...)` resolution
- command-vs-subpipeline stage shaping
- pipeline source normalization for the public preview contract

## Keep Out of Scope

- `start()`, `resume()`, or `status()`
- runtime-mode selection or route-adapter helpers
- run-lifecycle or control-plane orchestration
- broader plan payload semantic changes

## Test Focus

- dedicated plan-shell helper coverage for command-vs-subpipeline stage shaping and pipeline source normalization
- existing preview-oriented CLI/orchestrator coverage that proves the external plan contract remains unchanged
- fallback coverage proving `planPreview` vs `planner.plan(...)` behavior remains exact
