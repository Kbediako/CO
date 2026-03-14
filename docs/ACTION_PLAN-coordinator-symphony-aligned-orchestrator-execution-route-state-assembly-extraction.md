# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Execution Route State Assembly Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1180`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the shared route-state assembly seam.

## Implementation

- [ ] Extract one bounded helper/module for shared execution-route state assembly around `resolveExecutionRouteState(...)`.
- [ ] Keep `routeOrchestratorExecution(...)` as the router-local failure and branch boundary while delegating env merge, runtime selection resolution, manifest application, and effective env assembly.
- [ ] Add focused regression coverage for runtime selection invocation, manifest application, and env-precedence behavior without reopening lifecycle or fallback-policy seams.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1180`.
