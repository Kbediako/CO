# TECH_SPEC: Coordinator Symphony-Aligned Control Server Public Lifecycle Shell Extraction

## Context

`1153` already moved the ready-instance lifecycle shell into `controlServerReadyInstanceLifecycle.ts`. The remaining meaningful lifecycle concentration is now the public `ControlServer` shell itself: startup input preparation handoff, ready-instance activation handoff, and public shutdown delegation through the owned runtime closer. The adjacent startup helpers are already cohesive and should not be split further just for churn.

## In Scope

- Add one bounded public lifecycle helper adjacent to `controlServer.ts`
- Rewire `controlServer.ts` so the public handle delegates startup and shutdown orchestration through that helper
- Preserve the current `ControlServer` API and lifecycle semantics
- Keep focused public lifecycle regressions green

## Out of Scope

- Telegram bridge/runtime internals
- Ready-instance lifecycle internals already extracted in `1153`
- Startup-input schema, startup-sequence ordering, or bootstrap persistence changes
- Route/controller decomposition
- Broad refactors that collapse previously extracted seams back together

## Design

1. Introduce an adjacent helper that owns the remaining public startup/close shell around `ControlServer`.
2. Keep `controlServer.ts` as the public handle type and API owner, but make it delegate lifecycle orchestration through a narrow helper contract.
3. Preserve current lifecycle semantics exactly:
   - startup input preparation still happens before ready-instance activation
   - ready-instance activation still returns a fully ready handle before `start(...)` resolves
   - public `close()` still uses the shared lifecycle-state semantics established in `1153`
4. Avoid touching `controlServerReadyInstanceStartup.ts`, `controlServerStartupSequence.ts`, and `controlServerStartupInputPreparation.ts` unless an existing type must move to support the shell extraction.

## Validation

- Focused tests:
  - `orchestrator/tests/ControlServer.test.ts`
  - any new public-shell tests only if needed
- `delegation-guard`
- `spec-guard`
- `build`
- `lint`
- `test`
- `docs:check`
- `docs:freshness`
- `diff-budget`
- `review`
- `pack:smoke`
