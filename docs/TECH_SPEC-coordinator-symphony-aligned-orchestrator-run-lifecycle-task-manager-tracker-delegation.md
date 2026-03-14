# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Run Lifecycle Task Manager Tracker Delegation

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1188-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-tracker-delegation`
- Status: Draft

## Background

`1187` extracted the tracker logic into `orchestratorPlanTargetTracker.ts`, but `orchestrator.ts` still keeps a local private forwarding method:

- `attachPlanTargetTracker(...)`

That wrapper does not own any remaining logic. It only forwards the call from `createRunLifecycleTaskManager(...)` to the helper extracted in `1187`.

## Scope

- remove the local `attachPlanTargetTracker(...)` wrapper from `orchestrator.ts`
- delegate directly to `attachOrchestratorPlanTargetTracker(...)` from `createRunLifecycleTaskManager(...)`
- preserve focused task-manager registration regressions

## Out of Scope

- tracker helper behavior in `orchestratorPlanTargetTracker.ts`
- `performRunLifecycle(...)`
- public `start()` / `resume()` lifecycle behavior
- `createRunLifecycleTaskManager(...)` registration assembly
- route-decision or execution-mode policy helpers
- cloud/local execution shells
- broader lifecycle or control-plane redesign

## Proposed Approach

1. Remove the private `attachPlanTargetTracker(...)` wrapper from `CodexOrchestrator`.
2. Call `attachOrchestratorPlanTargetTracker(...)` directly inside `createRunLifecycleTaskManager(...)`.
3. Update the wrapper-level registration test to spy on the shared helper instead of the removed private method.
4. Keep the helper-level tracker behavior tests from `1187` as the narrower behavior proof.

## Validation

- standard docs-first guards before implementation
- focused task-manager registration plus tracker helper regressions during implementation
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- over-scoping this lane into broader task-manager or lifecycle extraction would reopen already stabilized seams
- changing the call site without preserving the current attach-on-success behavior would regress tracker registration timing
