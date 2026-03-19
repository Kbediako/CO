# PRD - Coordinator Symphony-Aligned Control Runtime Canonical Read Model Exposure (1026)

## Summary
- Problem Statement: after `1025`, CO has a shared observability read-model module, but `ControlRuntime` still exposes transport-facing compatibility methods as its primary internal read contract. Telegram status and issue rendering still consume compatibility `state`/`issue` envelopes rather than a runtime-owned canonical selected-run model, which keeps the runtime boundary more HTTP-shaped than Symphony's orchestrator-first pattern.
- Desired Outcome: expose a canonical selected-run/read-model seam directly from `ControlRuntime`, let Telegram consume that in-process model for `/status`, `/issue`, and projection-push dedupe, and keep HTTP compatibility routes as thin transport shells over the existing runtime/surface layers.
- Scope Status: docs-first implementation stream for task `1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and keep delivering the Symphony-aligned CO slices end to end.
- Use the real `openai/symphony` repo as the reference baseline and correct any remaining transport-first assumptions from earlier work.
- Stay open to meaningful refactors, but keep each slice bounded, validated, and documented.
- Preserve CO's harder authority model:
  - CO remains execution authority,
  - Linear remains advisory-only and fail-closed,
  - Telegram remains bounded and allowlisted,
  - no scheduler ownership transfer.
- Keep Telegram usable as an operator and future downstream-user surface without coupling runtime ownership to an HTTP compatibility contract.

## Baseline and Gap
- `1015` through `1025` already moved CO toward a cleaner layering:
  - selected-run projection is extracted,
  - observability HTTP/UI shaping is isolated,
  - Telegram reads are in-process,
  - update notification is generic,
  - runtime ownership and advisory/provider boundaries are explicit,
  - snapshot/read-model shaping is shared.
- The remaining structural mismatch is now centered on the runtime boundary itself:
  - `ControlRuntimeSnapshot` still exports `readCompatibilityState()` and `readCompatibilityIssue()` as its primary read contract,
  - Telegram's read adapter still depends on those compatibility envelopes,
  - projection-push hashing still derives from the compatibility `state` payload rather than the canonical runtime-owned selected-run model.
- Real Symphony continues to point to a narrower next move:
  - orchestrator/runtime state first,
  - presenter/controller shells second,
  - optional surfaces consume shared runtime state instead of becoming the runtime's internal contract.

## Goals
- Expose one canonical selected-run/read-model seam directly from `ControlRuntime`.
- Remap Telegram status/issue rendering and projection-push dedupe to consume that runtime-owned model instead of compatibility `state`/`issue` payloads.
- Keep compatibility HTTP routes stable and transport-owned.
- Keep `/api/v1/dispatch`, `/api/v1/refresh`, question expiry, audit emission, and mutation paths unchanged.
- Capture focused regression coverage and manual evidence for the runtime-seam change.

## Non-Goals
- No new public routes or webhook surfaces.
- No Telegram command expansion.
- No auth/session redesign.
- No provider reads added back to snapshot paths.
- No Linear authority widening or mutations.
- No broad rewrite of observability HTTP/UI shaping in this slice.
- No Elixir/BEAM rewrite.

## Stakeholders
- Product: CO operators and future downstream CO users using Telegram as a control/visibility surface.
- Engineering: CO control/runtime maintainers.
- Operations: operators who need stable, auditable runtime state regardless of whether it is rendered over HTTP/UI or Telegram.

## Metrics & Guardrails
- Primary Success Metrics:
  - `ControlRuntime` exposes a canonical selected-run read model directly,
  - Telegram status/issue rendering no longer depends on compatibility `state`/`issue` envelopes,
  - Telegram projection-push dedupe fingerprints the canonical selected-run model rather than the compatibility state envelope,
  - HTTP compatibility route behavior remains unchanged.
- Guardrails / Error Budgets:
  - no repo-stored secrets,
  - no authority widening,
  - no provider I/O added to snapshot reads,
  - no externally visible contract drift beyond internal runtime/read-model ownership.

## User Experience
- Personas:
  - CO operator checking status or issue detail via Telegram.
  - downstream user later using Telegram as another bounded CO surface.
- User Journeys:
  - Telegram renders the same selected-run facts that the runtime actually owns, not a compatibility wrapper,
  - compatibility HTTP still behaves the same for existing consumers,
  - a runtime-owned read-model seam is available for later surfaces without reusing HTTP envelopes as internal state.

## Technical Considerations
- Architectural Notes:
  - use real Symphony as structural guidance, not as a product-surface mandate,
  - prefer canonical runtime state/read-model seams over transport-shaped internal contracts,
  - let Telegram stay a thin renderer over a runtime-owned model,
  - keep provider I/O, audit emission, and transport-specific control logic outside the canonical read model.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/telegramOversightBridge.ts`
  - `orchestrator/src/cli/control/controlServer.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - real `openai/symphony` `SPEC.md`, `elixir/lib/symphony_elixir/orchestrator.ex`, `elixir/lib/symphony_elixir_web/presenter.ex`, and `elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex` as read-only reference only

## Open Questions
- Whether a later slice should also move HTTP compatibility state/issue shaping onto the new runtime-owned model directly, or whether keeping that behind `observabilitySurface.ts` is the right stopping point.
- Whether the runtime-owned read-model seam should later grow to cover queued questions directly, or whether the Telegram adapter should continue reading them from the question queue independently.

## Approvals
- Product: Codex (per user-approved current and future slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
