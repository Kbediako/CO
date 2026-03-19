# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Control Plane Lifecycle Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction`
- Status: Draft

## Background

`1190` extracted the run-lifecycle orchestration shell and `1192` extracted the remaining route-entry callback shell. The next non-trivial private orchestration body in `orchestrator.ts` is now the control-plane lifecycle envelope around `withControlPlaneLifecycle(...)` and the adjacent run-event publisher assembly.

## Scope

- extract the remaining `withControlPlaneLifecycle(...)` shell from `orchestrator.ts` into one bounded helper under `orchestrator/src/cli/services/`
- move or delegate:
  - `startOrchestratorControlPlaneLifecycle(...)` startup wiring
  - `createRunEventPublisher(...)` assembly or its direct helper handoff
  - `runWithLifecycle(...)` context handoff of `runEvents`, `eventStream`, and `onEventEntry`
  - failure cleanup through `controlPlaneLifecycle.close()`
- preserve current control-plane startup failure behavior and run-event wiring exactly

## Out of Scope

- public `start()` / `resume()` preparation logic
- `performRunLifecycle(...)` and run-lifecycle orchestration shell behavior
- control-plane validator/service behavior
- route-entry or route-decision behavior
- broader orchestrator redesign

## Proposed Approach

1. Introduce one bounded control-plane lifecycle shell helper under `orchestrator/src/cli/services/`.
2. Move the private `withControlPlaneLifecycle(...)` envelope into that helper.
3. Keep `orchestrator.ts` as the broader public lifecycle owner while delegating the control-plane lifecycle shell.
4. Preserve current failure handling, event publisher wiring, and cleanup ordering exactly.
5. Add or adapt focused tests around control-plane lifecycle startup/cleanup and run-event publisher behavior.

## Validation

- standard docs-first guards before implementation
- focused control-plane lifecycle and event-publisher regressions during implementation:
  - `orchestrator/tests/OrchestratorControlPlaneLifecycle.test.ts`
  - `orchestrator/tests/RunEvents.test.ts`
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- changing startup failure ordering would create subtle resume/start regressions
- changing run-event publisher wiring would silently weaken lifecycle telemetry behavior
- widening into validator/service or public lifecycle logic would break the bounded seam
