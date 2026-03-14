# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud Execution Lifecycle Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1191-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction`
- Status: Draft

## Background

`1178` extracted the generic cloud execution lifecycle helper, `1181` extracted the cloud route shell, and `1190` extracted the run-lifecycle orchestration shell. The remaining class-private cloud orchestration body is now the `executeCloudPipeline(...)` / `runCloudExecutionLifecycleShell(...)` pair in `orchestrator.ts`.

## Scope

- extract the private cloud execution lifecycle shell from `orchestrator.ts` into one bounded helper under `orchestrator/src/cli/services/`
- move the `runOrchestratorExecutionLifecycle(...)` call and `executeOrchestratorCloudTarget(...)` execute-body assembly through that helper
- preserve:
  - `defaultFailureStatusDetail: 'cloud-execution-failed'`
  - `advancedDecisionEnv: { ...process.env, ...(envOverrides ?? {}) }`
  - note ordering and lifecycle note passthrough
  - passthrough of `runAutoScout`, `runEvents`, `eventStream`, `onEventEntry`, and persistence/control watcher wiring

## Out of Scope

- route-decision or execution-mode policy behavior
- public `start()` / `resume()` behavior
- local execution lifecycle behavior
- cloud target executor logic changes
- broader orchestrator redesign

## Proposed Approach

1. Introduce one bounded cloud execution lifecycle shell helper under `orchestrator/src/cli/services/`.
2. Move `runCloudExecutionLifecycleShell(...)` orchestration into that helper.
3. Keep `executeCloudPipeline(...)` in `orchestrator.ts` as a thin delegate.
4. Preserve current callback wiring and note ordering exactly.
5. Add or adapt focused tests around failure-detail forwarding, env merge behavior, execute-body wiring, and thin-delegate behavior.

## Validation

- standard docs-first guards before implementation
- focused cloud execution lifecycle regressions during implementation
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- dropping exact note ordering or failure-detail strings would create subtle behavior drift
- losing `runAutoScout` or event/persister passthrough would silently weaken lifecycle behavior
- widening into route-decision or cloud executor behavior would break the bounded seam
