# PRD - Coordinator Symphony-Aligned Shared Observability Read Model + Telegram Projection Dedupe (1025)

## Summary
- Problem Statement: after `1024`, CO's snapshot surfaces are provider-free, but the shared read-model contract is still fragmented. `selectedRunProjection.ts` and `observabilitySurface.ts` duplicate tracked Linear payload shaping, HTTP/UI payloads still manually reassemble overlapping selected-run fields, and Telegram re-declares API-shaped payload types instead of consuming one canonical in-process read model. That leaves one real behavior bug: Telegram push dedupe hashes only `queued_count` and `latest_question_id`, so visible `/status` text can change when question prompt or urgency changes under the same question id without triggering a projection push.
- Desired Outcome: introduce one shared internal observability read-model layer for selected-run, running-summary, tracked-linear, question-summary, and dispatch-summary data; keep HTTP/UI/Telegram as thin surface renderers over that shared model; and fix Telegram projection hashing so it reflects the same question-summary fields that the rendered status message exposes.
- Scope Status: docs-first implementation stream for task `1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and keep delivering the current Symphony-aligned CO slices end to end.
- Use the real `openai/symphony` repo as the reference and correct any transport-first assumptions from earlier work.
- Be open to larger refactors when they materially improve the architecture, but keep each slice bounded and evidence-backed.
- Preserve CO's harder authority model:
  - CO remains execution authority,
  - Linear remains advisory-only and fail-closed,
  - Telegram remains bounded and allowlisted,
  - no scheduler ownership transfer.
- Keep Telegram and Linear fully under CO control while treating human-readable surfaces as optional shells over canonical coordinator state.

## Baseline and Gap
- `1015` through `1024` already aligned the main runtime seams:
  - selected-run projection is extracted,
  - observability HTTP/UI shaping is isolated,
  - Telegram reads reuse in-process runtime state,
  - update signaling is generic,
  - runtime ownership and live-Linear separation are now explicit.
- The remaining mismatch is the shared read-model contract itself:
  - tracked Linear payload shaping still exists in both `selectedRunProjection.ts` and `observabilitySurface.ts`,
  - UI `task` and `run` entries still manually reassemble overlapping selected-run summary fields,
  - Telegram re-declares read payload types and consumes HTTP-compatible envelopes instead of one canonical in-process model,
  - Telegram projection dedupe does not track all rendered question-summary fields.
- Real Symphony points to a narrower, more durable seam than another controller or transport slice:
  - normalize data once,
  - materialize coordinator snapshot/read state once,
  - let optional surfaces render from that shared state,
  - keep provider I/O and transport-specific control logic out of the shared read-model layer.

## Goals
- Extract one shared internal observability read-model layer under `orchestrator/src/cli/control/`.
- Remove duplicate tracked Linear payload shaping across selected-run projection and observability surface code.
- Make state/issue/UI payload builders consume the shared read model instead of reassembling overlapping selected-run summary fields independently.
- Make Telegram rendering consume the same shared read-model types rather than a shadow API-payload contract.
- Fix Telegram projection hashing so push dedupe reflects the question-summary fields that visible `/status` output actually includes.
- Keep `/api/v1/dispatch` as the explicit live advisory read path and keep its fail-closed behavior intact.

## Non-Goals
- No route/auth/webhook/mutation-path redesign.
- No Linear authority widening or mutations.
- No Telegram command-set redesign.
- No new public surface or contract widening beyond existing backed fields.
- No background worker/poller addition.
- No Elixir/BEAM rewrite.

## Stakeholders
- Product: CO operators and future downstream CO users relying on HTTP/UI/Telegram status surfaces.
- Engineering: CO control/runtime maintainers.
- Operations: operators who need consistent, auditable status projections across surfaces without transport-specific drift.

## Metrics & Guardrails
- Primary Success Metrics:
  - one canonical shared read-model boundary feeds HTTP/UI/Telegram snapshot surfaces,
  - duplicate tracked Linear payload shaping is removed,
  - Telegram push dedupe now emits when rendered question prompt or urgency changes under the same question id,
  - no behavior regressions for existing state/issue/UI/dispatch routes beyond the intentional Telegram hash correction.
- Guardrails / Error Budgets:
  - no repo-stored secrets,
  - no authority widening,
  - no live provider reads added back to snapshot surfaces,
  - no new externally visible fields without real backing state.

## User Experience
- Personas:
  - CO operator checking status via Telegram.
  - operator or downstream user reading compatibility HTTP or UI surfaces.
- User Journeys:
  - the same selected-run/question/tracked-linear facts appear consistently across HTTP/UI/Telegram,
  - projection pushes do not silently miss a visible question prompt/urgency update,
  - dispatch remains a separate explicit advisory read path.

## Technical Considerations
- Architectural Notes:
  - use real Symphony as structural guidance, not as a product surface mandate,
  - prefer a canonical shared snapshot/read-model seam over another transport-specific extraction,
  - let each transport keep its own renderer while consuming the same underlying typed read model,
  - keep provider I/O outside the shared read-model layer.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/controlServer.ts`
  - `orchestrator/src/cli/control/telegramOversightBridge.ts`
  - real `openai/symphony` `SPEC.md`, `elixir/lib/symphony_elixir_web/presenter.ex`, `elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, and `elixir/lib/symphony_elixir/tracker.ex` as read-only reference only

## Open Questions
- Whether a later slice should move the remaining dispatch-summary typing out of transport-facing payloads entirely, or whether the shared snapshot/read model is the right stopping point for now.
- Whether UI-specific list-entry shaping should remain local to the HTTP/UI adapter once the shared selected-run summary is canonicalized.

## Approvals
- Product: Codex (per user-approved current and future slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
