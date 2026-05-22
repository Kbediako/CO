# 1194 Deliberation - Orchestrator Start Preparation Shell Extraction

## Decision

Open `1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction` as the next bounded Symphony-aligned lane after `1193`.

## Why This Seam

- `1193` already removed the private control-plane lifecycle shell.
- The remaining non-trivial public shell in `orchestrator.ts` is now the `start()` preparation cluster before the lifecycle helper call.
- That cluster is cohesive and bounded, and it can move without reopening `resume()`, execution routing, or run-lifecycle orchestration.

## In Scope

- `prepareRun(...)`
- `generateRunId()`
- runtime-mode resolution
- `bootstrapManifest(...)`
- initial runtime-mode / summary application
- `ManifestPersister` construction

## Out of Scope

- `resume()` preparation and resume-token handling
- `runOrchestratorControlPlaneLifecycleShell(...)`
- `performRunLifecycle(...)`
- routing or execution-mode policy helpers

## Notes

- Keep the helper additive and thin; `orchestrator.ts` should still own the public `start()` surface.
- The existing control-plane lifecycle shell from `1193` remains the downstream handoff boundary.
