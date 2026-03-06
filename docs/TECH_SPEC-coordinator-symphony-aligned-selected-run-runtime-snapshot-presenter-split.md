# TECH_SPEC - Coordinator Symphony-Aligned Selected-Run Runtime Snapshot + Presenter Split (1027)

Canonical TECH_SPEC: `tasks/specs/1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md`.

## Summary
- Objective: replace the presenter-shaped selected-run runtime seam from `1026` with a transport-neutral runtime snapshot and move HTTP/Telegram read-side shaping onto presenter adapters over that snapshot.
- Scope: one runtime snapshot type, explicit presenter mappings, dead-helper removal, focused regression/manual evidence.
- Constraints: keep public HTTP payloads stable, keep snapshot reads provider-free, and preserve CO's authority/auth posture.

## Architecture
- `ControlRuntimeSnapshot` should expose one selected-run runtime snapshot for internal consumers.
- The runtime snapshot should carry canonical selected-run, tracked, and dispatch-summary facts without public DTO naming or shape requirements.
- `observabilitySurface.ts` should build compatibility `/state` and `/issue` payloads from that runtime snapshot.
- `telegramOversightBridge.ts` should render `/status`, `/issue`, and projection hashes from presenter helpers built over that runtime snapshot.
- `resolveIssueIdentifier()` should be removed if the presenter helpers no longer require it.

## Implementation Requirements
- Add a transport-neutral selected-run runtime snapshot type plus runtime builder.
- Move public DTO shaping out of the runtime seam and into presenter helpers.
- Keep Telegram-visible text and hash invalidation semantics coherent.
- Keep `/api/v1/dispatch`, `/api/v1/refresh`, mutation paths, and advisory caching behavior unchanged.

## File Scope
- Primary implementation paths:
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/telegramOversightBridge.ts`
- Secondary/supporting paths:
  - `orchestrator/src/cli/control/controlServer.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/TelegramOversightBridge.test.ts`
  - `orchestrator/tests/ControlServer.test.ts`

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and likely immediate implementation as the next slice after `1026`.
- Reasoning: `1026` fixed the behavior seam, but the runtime contract still exports presenter DTOs. The narrowest remaining correction is therefore a type-ownership refactor rather than another behavior expansion.
- Initial review evidence: `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/20260306T182203Z-closeout/14-next-slice-note.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/SPEC.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir/orchestrator.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`.

## Technical Requirements
- Functional requirements:
  - runtime-selected-run reads use a transport-neutral snapshot type,
  - compatibility `/state` and `/issue` presenters derive from that runtime snapshot,
  - Telegram status/issue/fingerprint shaping derives from that runtime snapshot,
  - dead runtime helper surface is removed where the presenter split makes it unnecessary,
  - existing public HTTP payloads and Telegram semantics stay stable.
- Non-functional requirements:
  - bounded refactor only,
  - no public contract widening,
  - no provider I/O on snapshot paths,
  - preserve runtime snapshot coherence across refresh/publish flows.

## Validation Plan
- Tests / checks:
  - targeted `ControlRuntime`, `TelegramOversightBridge`, and `ControlServer` coverage,
  - regression that runtime snapshot and compatibility presenters stay aligned,
  - regression that Telegram presenter outputs and hashes stay stable,
  - full validation chain for the owned diff.
- Rollout verification:
  - docs-review manifest captured before implementation,
  - explicit elegance review and manual mock usage evidence before closeout.

## Open Questions
- Whether compatibility HTTP read methods remain publicly exposed on `ControlRuntimeSnapshot` for now, or whether the selected-run runtime snapshot should become the only internal read surface touched by controllers/presenters.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
