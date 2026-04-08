# TECH_SPEC - Coordinator Symphony-Aligned Control Runtime Canonical Read Model Exposure (1026)

Canonical TECH_SPEC: `tasks/specs/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md`.

## Summary
- Objective: expose a canonical selected-run/read-model seam directly from `ControlRuntime` and move Telegram read-side status/issue rendering plus projection-push dedupe onto that seam.
- Scope: one runtime contract addition, one Telegram read-adapter/remap, small shared read-model helper additions where needed, and focused regression/manual evidence.
- Constraints: keep compatibility HTTP route behavior unchanged, keep snapshot reads provider-free, and keep CO's control/auth/authority posture intact.

## Architecture
- `ControlRuntimeSnapshot` should stop being effectively HTTP-first for internal consumers.
- The runtime should expose a canonical selected-run model derived from:
  - `selectedRunProjection.ts` selected-run context,
  - runtime-owned tracked Linear snapshot state,
  - runtime-owned dispatch pilot snapshot summary.
- Telegram should consume that canonical model directly for:
  - `/status`,
  - `/issue`,
  - projection-push fingerprinting.
- Compatibility HTTP state/issue routes may continue returning transport-facing payloads, but they should no longer be required as Telegram's internal read contract.

## Implementation Requirements
- Add a runtime-owned canonical read-model interface for selected-run reads.
- Keep the canonical model transport-agnostic:
  - selected-run context,
  - tracked summary,
  - dispatch-pilot summary.
- Keep question queue reads separate unless a genuinely canonical question seam is already available.
- Keep `/api/v1/dispatch`, `/api/v1/refresh`, and mutation paths unchanged.
- Preserve current route status codes, error handling, audit emission, and auth behavior.

## File Scope
- Primary implementation paths:
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/telegramOversightBridge.ts`
  - `orchestrator/src/cli/control/controlServer.ts`
- Secondary/supporting paths:
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/TelegramOversightBridge.test.ts`
  - `orchestrator/tests/ControlServer.test.ts` if route stability coverage needs adjustment

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and immediate implementation as the next slice after `1025`.
- Reasoning: `1025` unified snapshot shaping, but the runtime contract still leans on compatibility HTTP envelopes. Real Symphony keeps orchestrator/runtime snapshot state primary and presenter/controller layers thin. The narrowest remaining correction is therefore to expose the canonical runtime-owned selected-run seam directly from `ControlRuntime` and let Telegram consume it without another transport-shaped hop.
- Initial review evidence: `docs/findings/1026-control-runtime-canonical-read-model-exposure-deliberation.md`, `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/20260306T173344Z-closeout/15-next-slice-note.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/SPEC.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir/orchestrator.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`.

## Technical Requirements
- Functional requirements:
  - `ControlRuntimeSnapshot` exposes a canonical selected-run/read-model method for internal consumers,
  - Telegram read-side status and issue rendering use that canonical model,
  - Telegram projection-push fingerprinting uses the canonical model instead of the compatibility `state` payload,
  - compatibility HTTP state/issue/dispatch/refresh behavior remains unchanged,
  - `resolveIssueIdentifier()` remains coherent with the canonical read model.
- Non-functional requirements:
  - bounded refactor only,
  - no public contract widening,
  - no provider I/O on snapshot paths,
  - keep caching/prime semantics coherent within a runtime snapshot.
- Interfaces / contracts:
  - existing public HTTP payloads remain backward-compatible,
  - Telegram command outputs may change only where rendering now comes from the canonical runtime model with equivalent facts.

## Validation Plan
- Tests / checks:
  - targeted `ControlRuntime`, `TelegramOversightBridge`, and `ControlServer` coverage,
  - regression proving Telegram reads no longer require compatibility `state`/`issue` envelopes,
  - regression proving projection-push hashing still invalidates correctly from the canonical model,
  - full validation chain for the owned diff.
- Rollout verification:
  - docs-review manifest captured before implementation,
  - manual mock usage evidence for Telegram status/issue parity after the seam change,
  - explicit elegance review captured before closeout.
- Monitoring / alerts:
  - record explicit override reasons if shared-branch full-suite or review noise recurs.

## Open Questions
- Whether a later slice should also expose a canonical queued-question model from `ControlRuntime`, or whether that remains intentionally separate from the selected-run read model.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
