# Findings - 1026 Control Runtime Canonical Read Model Exposure

## Decision
- Proceed with a bounded follow-up slice that exposes a canonical selected-run/read model directly from `ControlRuntime` and moves Telegram read-side status/issue rendering plus projection-push hashing onto that seam.

## Why This Slice Next
- `1025` closed shared snapshot/read-model duplication, but the runtime contract is still transport-shaped because `ControlRuntimeSnapshot` continues to center compatibility HTTP payload methods.
- Telegram remains the clearest consumer of that mismatch:
  - it reads in-process now,
  - but it still depends on compatibility `state` and `issue` envelopes,
  - so the runtime boundary is still more HTTP-shaped than orchestration-shaped.
- Real Symphony reinforces the next move:
  - orchestrator snapshot/runtime state first,
  - presenter/controller shells second,
  - optional surfaces consume shared runtime state rather than becoming the runtime contract.

## Local Evidence
- `orchestrator/src/cli/control/controlRuntime.ts` exposes `readCompatibilityState()` and `readCompatibilityIssue()` as the main internal read contract.
- `orchestrator/src/cli/control/controlServer.ts` builds the Telegram adapter from those compatibility runtime methods.
- `orchestrator/src/cli/control/telegramOversightBridge.ts` renders `/status` and `/issue` from compatibility payload types rather than directly from a runtime-owned selected-run model.
- `orchestrator/src/cli/control/telegramOversightBridge.ts` computes projection-push hashes from compatibility `state` payloads instead of from the canonical runtime-selected-run facts.

## Real-Symphony Evidence
- `SPEC.md` places the authoritative orchestrator state in the coordination layer and treats the status surface as optional.
- `elixir/lib/symphony_elixir/orchestrator.ex` owns the authoritative runtime state.
- `elixir/lib/symphony_elixir_web/presenter.ex` projects orchestrator snapshot state for surfaces.
- `elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex` stays thin and delegates to the presenter rather than becoming the internal runtime contract.

## Delegated Review Synthesis
- A bounded real-Symphony explorer stream confirmed that the next durable step is one runtime-owned snapshot/read model with thin transport consumers, not a reopening of completed CO slices.
- A bounded CO-local explorer stream identified the narrowest implementation path:
  - add one canonical selected-run read-model method to `ControlRuntime`,
  - let Telegram consume that method for `/status`, `/issue`, and projection hashing,
  - keep compatibility HTTP state/issue wrappers alive for now.

## Minimal Recommendation
- Add one canonical selected-run/read-model method to `ControlRuntime`.
- Remap Telegram status/issue rendering and projection-push hashing to consume that method directly.
- Keep compatibility HTTP state/issue payload methods stable for now.
- Treat any broader compatibility-surface migration as a later optional slice, not a requirement for this lane.

## Non-Goals
- No new routes or Telegram commands.
- No auth/session redesign.
- No provider-read reintroduction on snapshot paths.
- No scheduler or authority model changes.
