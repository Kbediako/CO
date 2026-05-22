# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Plan-Target Tracker Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction`
- Status: Draft

## Background

`1186` extracted the route-adapter shell into `orchestratorExecutionRouteAdapterShell.ts`, but `orchestrator.ts` still owns the remaining plan-target tracker side-effect shell:

- `attachPlanTargetTracker(...)`
- the `plan:completed` bus bridge
- manifest mutation plus persist/warn behavior

The earlier `1162` lane already extracted the broader TaskManager-registration harness from `performRunLifecycle(...)`, so this follow-on lane should stay smaller than a new task-manager-shell abstraction.

## Scope

- extract one bounded tracker helper adjacent to `orchestrator.ts`
- move:
  - `attachPlanTargetTracker(...)`
  - the `plan:completed` listener body
  - manifest persist/warn handling for `plan_target_id`
- keep `createRunLifecycleTaskManager(...)` as the owner of registration assembly and TaskManager creation
- preserve the existing task-manager registration contract through focused regressions

## Out of Scope

- `performRunLifecycle(...)`
- public `start()` / `resume()` lifecycle behavior
- `createRunLifecycleTaskManager(...)` registration assembly
- `createOrchestratorRunLifecycleExecutionRegistration(...)`
- route-decision or execution-mode policy helpers
- cloud/local execution shells
- control-plane guard or scheduler planning
- broader bootstrap or control-plane redesign

## Proposed Approach

1. Introduce one bounded helper, likely `orchestratorPlanTargetTracker.ts`, that owns tracker attachment and manifest persist/warn behavior.
2. Rewire `createRunLifecycleTaskManager(...)` to delegate only tracker attachment while preserving its current registration and manager-creation ownership.
3. Add one focused helper test for tracker mutation, unchanged-target skip behavior, and warn-without-throw persistence failures.
4. Preserve the existing wrapper-level task-manager registration test so `createRunLifecycleTaskManager(...)` still proves attach-on-success and no-attach-on-failure behavior.

## Validation

- standard docs-first guards before implementation
- focused tracker and task-manager registration regressions during implementation
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- moving too little leaves `orchestrator.ts` holding avoidable tracker side effects
- moving too much would reopen registration assembly or broader lifecycle seams that are already correctly bounded
