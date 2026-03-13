# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Guard-and-Planning Shell Extraction

- Date: 2026-03-13
- Owner: Codex (top-level agent)
- Task: `1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction`
- Status: Draft

## Background

`1161` extracted completion handling and `1162` extracted TaskManager registration into a class-local helper. The next truthful remaining cluster in `orchestrator/src/cli/orchestrator.ts` is now the ordered orchestration immediately after the explicit privacy reset:

1. `this.controlPlane.guard(...)`
2. `this.scheduler.createPlanForRun(...)`

The surrounding lifecycle still owns this sequencing inline, even though both steps already dispatch through narrower service surfaces.

## Scope

- Extract the post-privacy-reset guard-and-planning shell from `performRunLifecycle(...)` into one bounded helper
- Move with that extraction:
  - `this.controlPlane.guard(...)`
  - `this.scheduler.createPlanForRun(...)`
- Return the resulting pair `{ controlPlaneResult, schedulerPlan }` to the existing lifecycle
- Add focused regressions for ordering, forwarding, and guard-failure short-circuit behavior

## Out of Scope

- The explicit `getPrivacyGuard().reset()` call immediately before the cluster
- TaskManager registration extracted in `1162`
- `manager.execute(...)`, `runError(...)`, or completion handling
- Public `start()` / `resume()` lifecycle entrypoints
- Broader service refactors inside `ControlPlaneService` or `SchedulerService`

## Proposed Approach

1. Introduce one bounded class-local helper adjacent to `performRunLifecycle(...)`.
2. Move the ordered guard/planning orchestration into that helper, keeping the shared inputs and return values explicit.
3. Keep `performRunLifecycle(...)` as the owner of:
   - privacy reset
   - task-manager registration helper invocation
   - `manager.execute(...)` and error emission
   - completion delegation
4. Add focused regressions that pin:
   - guard executes before scheduler planning
   - the helper forwards the existing lifecycle inputs unchanged
   - scheduler planning is skipped when guard throws

## Validation

- Focused orchestrator guard-and-planning regressions
- Standard deterministic gate bundle before closeout
- Explicit elegance review

## Risks

- Pulling the privacy reset into the helper would broaden the seam unnecessarily.
- Pulling the services themselves into new abstractions would duplicate already-bounded ownership and turn this into wrapper churn.
