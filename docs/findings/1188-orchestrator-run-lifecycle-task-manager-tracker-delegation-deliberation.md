# Findings: 1188 Orchestrator Run Lifecycle Task Manager Tracker Delegation Deliberation

## Decision

- Proceed with a bounded `1188` lane for the remaining local tracker wrapper inside `createRunLifecycleTaskManager(...)`.

## Why This Slice

- `1187` already moved the tracker behavior into `orchestratorPlanTargetTracker.ts`, leaving only a forwarding wrapper behind in `orchestrator.ts`.
- Removing that wrapper is the smallest truthful next move and keeps the now-thin task-manager registration boundary honest.
- A broader task-manager or lifecycle extraction would reopen already-stabilized seams without adding meaningful architectural clarity.

## In Scope

- remove `attachPlanTargetTracker(...)` from `orchestrator.ts`
- direct delegation from `createRunLifecycleTaskManager(...)` to `attachOrchestratorPlanTargetTracker(...)`
- focused regressions for attach-on-success and no-attach-on-failure behavior

## Out of Scope

- tracker helper behavior changes
- `performRunLifecycle(...)`
- public `start()` / `resume()` lifecycle behavior
- route-adapter, routing, execution policy, cloud/local execution, or broader lifecycle ownership changes

## Review Posture

- Local scout review approves this as the next truthful seam after `1187`.
- Docs-review is explicitly overridden for this registration turn because the scout already narrowed the boundary and the deterministic docs-first guards are sufficient before the implementation step.
