# Findings: 1187 Orchestrator Plan-Target Tracker Shell Extraction Deliberation

## Decision

- Proceed with a bounded `1187` lane for the remaining plan-target tracker shell still embedded in `orchestrator.ts`.

## Why This Slice

- `1186` already removed the route-adapter shell, so the next truthful remaining seam is now the `plan:completed` tracker side-effect bridge beside `createRunLifecycleTaskManager(...)`.
- The tracker attachment, manifest mutation, and persist/warn behavior are real logic, while the broader registration assembly is already mostly helper composition.
- This keeps the Symphony-aligned progression moving with the smaller honest slice instead of introducing another cosmetic task-manager wrapper helper.

## In Scope

- `attachPlanTargetTracker(...)` binding
- the `plan:completed` listener body
- manifest `plan_target_id` mutation plus persist/warn handling
- focused regressions for unchanged tracker attachment and `plan_target_id` semantics

## Out of Scope

- `performRunLifecycle(...)`
- public `start()` / `resume()` lifecycle behavior
- `createRunLifecycleTaskManager(...)` registration assembly
- `createOrchestratorRunLifecycleExecutionRegistration(...)`
- route-decision or execution-mode policy helpers
- cloud/local execution shells
- control-plane guard or scheduler planning

## Review Posture

- Local read-only review approves this as the next truthful seam after `1186`.
- Docs-review is explicitly overridden for registration in this turn because the lane already has a bounded local scout decision plus deterministic docs-first guards, and no implementation edits are being shipped in this registration commit.
