# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Start Preparation Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction`
- Status: Draft

## Background

`1190` extracted run-lifecycle orchestration, `1192` extracted the route-entry shell, and `1193` extracted the private control-plane lifecycle shell. The largest remaining cohesive shell in `orchestrator.ts` is now the `start()` preparation cluster before control-plane lifecycle delegation.

## Scope

- extract the `start()` preparation cluster from `orchestrator.ts` into one bounded helper under `orchestrator/src/cli/services/`
- move or delegate:
  - `prepareRun(...)`
  - `generateRunId()`
  - runtime-mode resolution
  - `bootstrapManifest(...)`
  - initial `applyRequestedRuntimeMode(...)` / `appendSummary(...)`
  - `ManifestPersister` construction
- preserve the exact inputs that are handed into the existing control-plane lifecycle shell

## Out of Scope

- `resume()` preparation, resume-token validation, or resume pre-start failure handling
- `runOrchestratorControlPlaneLifecycleShell(...)`
- `performRunLifecycle(...)`
- execution routing or execution-mode policy helpers
- manifest persistence behavior beyond equivalent wiring

## Proposed Approach

1. Introduce one bounded start-preparation helper under `orchestrator/src/cli/services/`.
2. Move the `start()` bootstrap cluster into that helper.
3. Keep `orchestrator.ts` as the public entrypoint while delegating only the preparation shell.
4. Preserve current manifest/bootstrap, runtime-mode, and persistence wiring exactly.
5. Add or adapt focused tests around `start()` bootstrap and lifecycle handoff wiring.

## Validation

- standard docs-first guards before implementation
- focused start-preparation regressions during implementation:
  - `orchestrator/tests/OrchestratorControlPlaneLifecycleShell.test.ts`
  - `orchestrator/tests/OrchestratorCleanupOrder.test.ts`
  - one new start-preparation shell test if needed to pin runtime-mode resolution, manifest bootstrap payloads, config notice appends, and persister interval wiring
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- changing startup manifest/bootstrap ordering would create subtle launch regressions
- changing runtime-mode application timing would skew downstream lifecycle behavior
- widening into `resume()` or broader public lifecycle ownership would break the bounded seam
