# 1193 Closeout Summary

- Landed the private control-plane lifecycle envelope behind `runOrchestratorControlPlaneLifecycleShell(...)` in `orchestrator/src/cli/services/orchestratorControlPlaneLifecycleShell.ts`.
- `orchestrator/src/cli/orchestrator.ts` now delegates the former `withControlPlaneLifecycle(...)` shell from both `start()` and `resume()` while keeping broader public lifecycle ownership in place.
- The final helper stays bounded: it owns emitter defaulting, control-plane startup, `onStartFailure` timing, run-event publisher construction, callback handoff, and `finally` cleanup through `controlPlaneLifecycle.close()`.
- Focused regressions passed `4/4` files and `10/10` tests.
- Full `npm run test` passed `227/227` files and `1539/1539` tests on the final tree.
- `delegation-guard`, `spec-guard`, `build`, `lint`, `docs:check`, `docs:freshness`, bounded `npm run review`, and `pack:smoke` all passed for the final tree.
