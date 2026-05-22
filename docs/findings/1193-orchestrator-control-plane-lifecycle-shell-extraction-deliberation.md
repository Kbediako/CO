# Findings: 1193 Orchestrator Control Plane Lifecycle Shell Extraction Deliberation

## Decision

- Proceed with a bounded `1193` lane for the remaining private control-plane lifecycle shell in `orchestrator.ts`.

## Why This Slice

- `1192` removed the remaining route-entry callback shell, leaving the control-plane lifecycle envelope as the next non-trivial private orchestration body.
- The seam is adjacent, bounded, and already has direct supporting test surfaces for control-plane lifecycle behavior and run-event publication.
- This continues the same Symphony-style class thinning pattern without reopening routing, validator/service behavior, or broader public lifecycle logic.

## In Scope

- move the `withControlPlaneLifecycle(...)` shell into a bounded service helper
- preserve control-plane startup failure behavior, run-event publisher wiring, and lifecycle cleanup ordering
- keep focused regressions at the control-plane lifecycle shell boundary

## Out of Scope

- public `start()` / `resume()` preparation flow
- run-lifecycle orchestration shell logic
- control-plane validator/service behavior
- route execution behavior

## Review Posture

- Local code inspection approves this as the next truthful seam after `1192`.
- Docs-review is captured as an explicit registration-time override if the wrapper stops before diff-local docs reasoning, because the deterministic docs-first guards plus the bounded local seam inspection are sufficient for registration.
