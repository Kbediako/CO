# Findings: 1190 Orchestrator Run Lifecycle Orchestration Shell Extraction Deliberation

## Decision

- Proceed with a bounded `1190` lane for the remaining run-lifecycle orchestration shell in `orchestrator.ts`.

## Why This Slice

- `1189` already removed local task-manager composition, so the remaining seam is no longer about manager assembly.
- The next localized boundary is the lifecycle envelope around guard/planning, execution, and error/completion ordering.
- This stays narrower than broader public lifecycle, routing, or control-plane changes while continuing the same Symphony-style extraction ladder.

## In Scope

- move the `performRunLifecycle(...)` orchestration shell into a bounded service helper
- move or delegate `runLifecycleGuardAndPlanning(...)` and `executeRunLifecycleTask(...)` through that helper
- preserve privacy-guard reset, guard short-circuit behavior, run-error ordering, and completion semantics

## Out of Scope

- public `start()` / `resume()` behavior
- task-manager composition changes
- route-decision, routing-policy, cloud/local execution, or control-plane redesign

## Review Posture

- Local scout review approves this as the next truthful seam after `1189`.
- Docs-review is explicitly overridden for this registration turn because the scout already narrowed the boundary and the deterministic docs-first guards are sufficient before the implementation step.
