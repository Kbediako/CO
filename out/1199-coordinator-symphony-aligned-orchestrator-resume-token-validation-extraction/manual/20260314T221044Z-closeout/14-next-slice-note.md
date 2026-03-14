# 1199 Next Slice Note

- The next truthful seam is the remaining `resume()` pre-start failure persistence callback still in `orchestrator/src/cli/orchestrator.ts`.
- That bounded slice should move only the `finalizeStatus(...)` plus `persistManifest(...)` / warning-handling contract behind the extracted resume control-plane lifecycle handoff, while keeping runtime selection, public command behavior, route adapters, and run-lifecycle orchestration out of scope.
- Likely implementation files: `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/services/orchestratorControlPlaneLifecycleShell.ts`, and possibly one new helper under `orchestrator/src/cli/services/`.
- Likely focused tests: the existing orchestrator/control-plane lifecycle tests around resume pre-start failure handling, plus a new dedicated helper test only if the persistence callback becomes independently testable.
