# PRD - Coordinator Symphony-Aligned Observability Update Notifier Extraction (1022)

## Summary
- Problem Statement: after `1015` through `1021`, CO's read-side boundaries are mostly aligned, but observability update signaling is still Telegram-specific. `controlServer.ts` threads `notifyTelegramProjectionDelta(...)` through `RequestContext`, publishers call that Telegram-named callback directly, and `ControlServer` owns the only subscription path.
- Desired Outcome: introduce a small in-process observability update notifier, closer to Symphony's `ObservabilityPubSub` pattern, so publishers emit generic update signals and Telegram becomes a subscriber rather than the hard-coded callback target.
- Scope Status: docs-first implementation stream for task `1022-coordinator-symphony-aligned-observability-update-notifier-extraction`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and keep delivering open Symphony-aligned slices end to end.
- Use the real `openai/symphony` repo as the reference and feel free to make larger refactors when they improve the architecture materially.
- Keep Telegram as a real operator and future downstream-user surface, but preserve CO's harder execution-authority model.
- Prefer the best of Symphony's internal structure and CO's hardened control posture rather than copying Symphony literally.

## Baseline and Gap
- `1015` centralized selected-run projection.
- `1018` extracted the observability surface.
- `1019` and `1020` split presenter/controller ownership for state/issue/dispatch routes.
- `1021` removed Telegram's in-process self-HTTP read loop and moved bridge reads onto the same internal read boundary.
- The main remaining mismatch is update signaling:
  - `RequestContext` still exposes `notifyTelegramProjectionDelta(...)`,
  - question flows, expiry, event-stream broadcast, and Linear webhook handling publish directly to that Telegram-named callback,
  - `ControlServer` still wires Telegram as the only observability update consumer.
- Real Symphony keeps observability data reads and update signaling separate:
  - dashboard consumers subscribe through `ObservabilityPubSub`,
  - publishers broadcast one coarse invalidation message rather than rich state,
  - subscribers decide when to re-read the presenter payload.

## Goals
- Introduce a narrow internal observability update notifier with generic publish/subscribe semantics.
- Remove Telegram-specific callback knowledge from `RequestContext` publishers and `broadcast(...)`.
- Keep Telegram projection push behavior coherent by subscribing the bridge to the new notifier.
- Preserve current trigger sources for observability updates unless a path is already intentionally silent.
- Keep the notifier safe when there are zero subscribers or when one subscriber fails.

## Non-Goals
- No `/control/action` rewrite in this slice.
- No SSE, webhook, or UI transport redesign.
- No multi-process or distributed pubsub system.
- No Telegram command or message-format redesign.
- No Linear authority widening or provider-behavior change.
- No BEAM/Elixir runtime work.

## Stakeholders
- Product: CO operators and future downstream CO users interacting through Telegram.
- Engineering: CO control-surface maintainers.
- Operations: operators relying on coherent question/dispatch/status update pushes without tighter Telegram coupling in the core server.

## Metrics & Guardrails
- Primary Success Metrics:
  - publishers no longer reference a Telegram-specific callback contract,
  - Telegram push behavior remains coherent across event-stream and question/Linear update sources,
  - startup/shutdown behavior remains safe when Telegram is disabled or unavailable.
- Guardrails / Error Budgets:
  - no authority widening,
  - no new external pubsub or socket surface,
  - no regression in push dedupe/cooldown behavior,
  - notifier failures remain fail-soft and bounded to the subscriber path.

## User Experience
- Personas:
  - CO operator using Telegram for real-time oversight updates.
  - future downstream CO user consuming the same projection-backed Telegram surface.
- User Journeys:
  - status/issue/dispatch/question updates still reach Telegram after relevant control-plane changes,
  - enabling or disabling Telegram does not change internal publisher behavior,
  - future non-Telegram consumers can subscribe without forcing publishers to know about them directly.

## Technical Considerations
- Architectural Notes:
  - use Symphony's `ObservabilityPubSub` pattern as the structural guide: publishers emit one generic update signal, and subscribers re-read the shared presenter/read model themselves,
  - keep the notifier in-process and minimal; CO does not need Phoenix PubSub semantics, rich event payload fanout, or distributed delivery for this lane,
  - keep Telegram read-side rendering and `/control/action` mutation handling unchanged; this slice is about update signaling ownership only.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/controlServer.ts`
  - `orchestrator/src/cli/control/telegramOversightBridge.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - real `openai/symphony` `ObservabilityPubSub`, `StatusDashboard`, and `DashboardLive` files as read-only reference only.

## Open Questions
- Whether the notifier should expose an unsubscribe handle directly or just return a cleanup closure from `subscribe(...)`.
- Whether a later slice should let non-Telegram observability consumers share the same notifier, or whether those should remain explicit follow-ons after this extraction lands.

## Approvals
- Product: Codex (per user-approved continuing slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
