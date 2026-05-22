# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Execution Route Adapter Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1186-coordinator-symphony-aligned-orchestrator-execution-route-adapter-shell-extraction`
- Status: Draft

## Background

`1180` through `1185` progressively thinned the execution-routing surface by extracting route-state assembly, cloud/local route shells, the route-decision shell, and execution-mode policy. The remaining cohesive routing seam is now the adaptation code still held directly inside `CodexOrchestrator` in `orchestrator.ts`.

## Scope

- extract one bounded route-adapter helper adjacent to `orchestrator.ts`
- move:
  - `createTaskManager(...)`
  - `executePipeline(...)`
  - the route-adapter wiring consumed by `createRunLifecycleTaskManager(...)`
- preserve router and policy helper contracts
- preserve current run-lifecycle call-site behavior through focused regressions

## Out of Scope

- `performRunLifecycle(...)`
- start/resume orchestration flow
- lifecycle registration or manifest bootstrapping
- router policy helpers
- cloud/local route shell internals
- execution-result semantics

## Proposed Approach

1. Introduce one bounded helper that owns the route-adapter shell now embedded in `orchestrator.ts`.
2. Move only the task-manager/pipeline adapter logic and callback wiring needed to invoke `routeOrchestratorExecution(...)`.
3. Keep `CodexOrchestrator` responsible for the broader run lifecycle, cloud execution shell, and non-routing orchestration responsibilities.
4. Preserve existing routing-focused tests and add/adjust assertions only where the new adapter seam needs direct coverage.

## Validation

- standard docs-first guards before implementation
- focused routing regressions during implementation
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- moving too little leaves the orchestrator class holding an avoidable routing shell
- moving too much would reopen broader lifecycle control and manifest semantics
