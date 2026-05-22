# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction`
- Status: Draft

## Background

`1186` extracted the route-adapter shell, `1187` extracted the tracker behavior, and `1188` removed the last local tracker wrapper. The remaining localized seam is now the task-manager composition still living in `orchestrator.ts`.

## Scope

- extract `createRunLifecycleTaskManager(...)` into a bounded service helper
- remove the local `createTaskManager(...)` forwarding wrapper as part of the same shell move
- compose existing helpers without changing their behavior:
  - `createOrchestratorRunLifecycleExecutionRegistration(...)`
  - `createOrchestratorTaskManager(...)`
  - `attachOrchestratorPlanTargetTracker(...)`
- preserve focused wrapper-level regressions

## Out of Scope

- `performRunLifecycle(...)`
- public `start()` / `resume()` lifecycle behavior
- routing policy and route-decision helpers
- cloud/local execution shells
- execution-registration, tracker-helper, or route-adapter behavior changes
- broader lifecycle or control-plane redesign

## Proposed Approach

1. Introduce one bounded helper under `orchestrator/src/cli/services/` to own task-manager composition.
2. Move `createRunLifecycleTaskManager(...)` composition into that helper.
3. Remove the now-redundant local `createTaskManager(...)` forwarding wrapper.
4. Keep `CodexOrchestrator` as the broader lifecycle owner and have it delegate to the new shell helper.
5. Add or adapt focused tests around the extracted task-manager shell boundary.

## Validation

- standard docs-first guards before implementation
- focused task-manager composition regressions during implementation
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- moving too little leaves a now-obvious composition shell stranded in `orchestrator.ts`
- moving too much would reopen broader lifecycle ownership already intentionally kept in `CodexOrchestrator`
