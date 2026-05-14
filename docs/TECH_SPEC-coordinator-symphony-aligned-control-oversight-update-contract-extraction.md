# TECH_SPEC: Coordinator Symphony-Aligned Control Oversight Update Contract Extraction

## Context

`1149` finished the read-side ownership move, so the remaining mismatch is now on the update side: `ControlTelegramBridgeLifecycle` still types its bridge wiring against `ControlOversightFacade`, even though the actual behavior it needs is only the projection-update `subscribe(...)` surface paired with the already-neutral read contract.

## In Scope

- Introduce one coordinator-owned oversight update contract module under `orchestrator/src/cli/control/`
- Move the projection-update `subscribe(...)` contract into that module
- Rewire `controlOversightFacade.ts` to compose the extracted update contract with the already-neutral read contract
- Rewire `controlTelegramBridgeLifecycle.ts` (and any direct bootstrap types that depend on it) to consume the neutral update boundary
- Keep focused lifecycle/update regressions green

## Out of Scope

- Telegram runtime lifecycle, polling, update handling, or projection-delivery behavior changes
- Read-contract or read-payload changes
- Controller presentation changes
- New non-Telegram consumers
- Broader `controlServer` work

## Design

1. Add a coordinator-owned oversight update-contract module that defines the `subscribe(...)` surface needed for projection updates.
2. Keep `controlOversightFacade.ts` as the composition seam, but have it extend the extracted update contract together with `ControlOversightReadContract`.
3. Update `controlTelegramBridgeLifecycle.ts` to depend on the neutral update boundary rather than a facade-specific type.
4. Preserve boundedness:
   - do not change projection/update semantics
   - do not change Telegram runtime lifecycle ownership
   - do not introduce a broad generic multi-channel abstraction in the same slice

## Validation

- Focused Telegram bridge lifecycle and oversight facade tests for the extracted update seam
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
