# Findings: 1150 Control Oversight Update Contract Extraction Deliberation

- Date: 2026-03-13
- Task: `1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction`

## Decision

After `1149`, the remaining truthful Symphony-aligned seam is the update-side `subscribe(...)` boundary that Telegram bridge lifecycle still reaches through `ControlOversightFacade`.

## Why this seam next

- The read contract is already neutralized in `controlOversightReadContract.ts`.
- `controlTelegramBridgeLifecycle.ts` still depends on `ControlOversightFacade` even though its update-side need is narrower than the full facade name suggests.
- Extracting the update contract is smaller and more defensible than broadening into Telegram lifecycle or projection-delivery refactors.

## Explicit Boundaries

- In scope: coordinator-owned update contract ownership and the minimal lifecycle typing rewiring that consumes it.
- Out of scope: Telegram runtime behavior, polling, projection queue semantics, read payloads, and broader controller/runtime refactors.

## Validation posture

- Minimum truthful proof is focused lifecycle/facade regression coverage plus the standard closeout gate bundle.
