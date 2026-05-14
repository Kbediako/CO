# TECH_SPEC: Coordinator Symphony-Aligned Control Server Ready Instance Lifecycle Shell Extraction

## Context

After `1152`, the bootstrap-local sequencing floor is lower: startup input preparation, ready-instance startup sequencing, bootstrap assembly, and generic bootstrap start sequencing already live in adjacent helpers. The remaining meaningful orchestration still sits in `controlServer.ts`, where `ControlServer` binds the request shell, manages pending instance publication, invokes ready-instance startup, and owns shutdown ordering inline.

## In Scope

- Add one bounded ready-instance lifecycle shell under `orchestrator/src/cli/control/`
- Rewire `controlServer.ts` to delegate ready-instance activation and owned shutdown orchestration
- Preserve the current `ControlServer` public surface and pending-to-ready request-shell behavior
- Keep focused startup/rollback and shutdown regressions green

## Out of Scope

- Telegram bridge/runtime internals (`controlTelegramBridge*`, `telegramOversightBridge*`, `telegramOversight*`)
- Route/controller decomposition or request normalization changes
- Control bootstrap metadata schema or persistence-path changes
- Expiry lifecycle policy changes
- Broad startup-surface rewrites that collapse multiple already-extracted helpers back together

## Design

1. Add an adjacent lifecycle helper, expected to be a ready-instance lifecycle shell such as `controlServerReadyInstanceLifecycle.ts`, that owns:
   - pending instance request-shell binding
   - ready-instance startup orchestration and rollback
   - owned shutdown ordering
2. Keep `ControlServer` as the owner of its public contract and private state while delegating orchestration through injected callbacks or a narrow runtime handle so the constructor visibility does not need to widen.
3. Preserve current orchestration semantics exactly:
   - request shell reads must remain safe while the instance is still pending
   - bootstrap-owned runtime handles must publish before ready-instance startup begins
   - startup failure must still close the partially assembled instance
   - shutdown must still close expiry lifecycle, bootstrap lifecycle, SSE clients, then the HTTP server
4. Keep `controlServerReadyInstanceStartup.ts` and `controlServerStartupSequence.ts` adjacent collaborators; only touch them if type-level seams must move to support the extraction.

## Validation

- Focused tests:
  - `orchestrator/tests/ControlServer.test.ts`
  - adjacent ready/startup tests only if needed:
    - `orchestrator/tests/ControlServerReadyInstanceStartup.test.ts`
    - `orchestrator/tests/ControlServerStartupSequence.test.ts`
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
