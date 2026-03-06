# Findings - 1027 Selected-Run Runtime Snapshot + Presenter Split

## Decision
- Proceed with a bounded follow-up slice that turns the selected-run runtime seam into a transport-neutral snapshot and pushes public payload/text shaping into presenter adapters.

## Why This Slice Next
- `1026` fixed the immediate Telegram-on-compatibility dependency, but it intentionally stopped short of a type-ownership split.
- The remaining structural mismatch is now narrow and explicit:
  - runtime-selected-run reads still return public DTOs,
  - presenter logic still bleeds into the runtime seam,
  - dead helper surface remains because presenters are not fully separated.
- Real Symphony keeps runtime/orchestrator snapshots authoritative and presenter/controller payloads derived, which makes this the smallest remaining Symphony-aligned boundary correction.

## Local Evidence
- `orchestrator/src/cli/control/controlRuntime.ts` still exports `readSelectedRunReadModel()` and `resolveIssueIdentifier()` using public DTO types.
- `orchestrator/src/cli/control/observabilityReadModel.ts` still builds the selected-run runtime seam via `buildSelectedRunPublicPayload()`.
- `orchestrator/src/cli/control/telegramOversightBridge.ts` and `orchestrator/src/cli/control/observabilitySurface.ts` both still consume payload-shaped selected-run data instead of a transport-neutral runtime snapshot.

## Bounded Scope
- In scope:
  - one runtime-owned selected-run snapshot type,
  - one presenter-mapping layer for compatibility HTTP payloads,
  - one presenter-mapping layer for Telegram text/fingerprint shaping,
  - dead-helper removal where safe.
- Out of scope:
  - new routes,
  - provider-behavior changes,
  - question-queue model redesign,
  - broader dispatch or authority changes.
