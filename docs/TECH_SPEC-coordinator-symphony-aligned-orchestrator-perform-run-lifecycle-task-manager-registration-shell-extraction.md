# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Task-Manager Registration Shell Extraction

- Date: 2026-03-13
- Owner: Codex (top-level agent)
- Task: `1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction`
- Status: Draft

## Background

`1159` extracted execution routing, `1160` extracted execution registration, and `1161` extracted the post-execution completion shell from `performRunLifecycle(...)`. The next dense inline cluster in `orchestrator/src/cli/orchestrator.ts` is now the TaskManager-registration harness immediately before privacy reset: compose `createOrchestratorRunLifecycleExecutionRegistration(...)`, build the `TaskManager`, and attach the `plan:completed` tracker.

## Scope

- Extract the TaskManager-registration harness from `performRunLifecycle(...)` into one bounded helper/service
- Move with that extraction:
  - `createOrchestratorRunLifecycleExecutionRegistration(...)`
  - `this.createTaskManager(...)`
  - `this.attachPlanTargetTracker(...)`
- Rewire `performRunLifecycle(...)` to delegate that shell without changing surrounding lifecycle authority
- Add focused regression coverage for manager wiring plus `plan_target_id` tracking continuity

## Out of Scope

- Privacy reset
- Control-plane guard execution
- Scheduler plan creation
- `manager.execute(...)` ownership, error-path emission, or completion handling
- Public `start()` / `resume()` lifecycle entrypoints
- Telegram / Linear / ControlServer seams

## Proposed Approach

1. Introduce one bounded TaskManager-registration helper adjacent to `orchestrator.ts`, likely under `orchestrator/src/cli/services/`.
2. Move the execution-registration composition, `TaskManager` creation, and plan-target tracker attachment into that helper while keeping the resulting manager/harness as its output.
3. Keep `performRunLifecycle(...)` as the owner of privacy reset, control-plane guard execution, scheduler plan creation, `manager.execute(...)`, error handling, and completion delegation.
4. Add focused regressions that pin harness continuity:
   - `executePipeline` / `getResult` forwarding remains intact
   - `TaskManager` receives the existing mode-policy/persistence inputs
   - `plan_target_id` tracking continues to persist on `plan:completed`

## Validation

- Focused orchestrator TaskManager-registration regressions
- Standard deterministic gate bundle before closeout
- Explicit elegance review

## Risks

- Pulling too much could reopen guard/planning or completion seams that are already correctly bounded.
- Pulling too little could leave the actual harness assembly inline and turn the helper into cosmetic wrapper churn.
