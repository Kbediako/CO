# Findings: 1189 Orchestrator Run Lifecycle Task Manager Shell Extraction Deliberation

## Decision

- Proceed with a bounded `1189` lane for the remaining task-manager composition shell in `orchestrator.ts`.

## Why This Slice

- `1188` only removed the final tracker wrapper; it did not move the enclosing task-manager shell.
- The remaining localized seam is exactly `createRunLifecycleTaskManager(...)` plus the local `createTaskManager(...)` forwarding wrapper.
- This stays narrower than broader lifecycle or routing changes and composes already-extracted helpers instead of reopening them.

## In Scope

- move `createRunLifecycleTaskManager(...)` into a bounded service helper
- remove the local `createTaskManager(...)` forwarding wrapper
- preserve focused manager-creation and tracker-attachment regressions

## Out of Scope

- `performRunLifecycle(...)`
- public `start()` / `resume()` lifecycle behavior
- routing-policy, route-decision, cloud/local execution, or broader lifecycle ownership changes

## Review Posture

- Local scout review approves this as the next truthful seam after `1188`.
- Docs-review is explicitly overridden for this registration turn because the scout already narrowed the boundary and the deterministic docs-first guards are sufficient before the implementation step.
