# PRD - Coordinator Symphony-Aligned Telegram In-Process Read Model Reuse (1021)

## Summary
- Problem Statement: after `1014` through `1020`, the Telegram oversight bridge still re-enters CO through its own in-process HTTP surfaces for `/api/v1/state`, `/api/v1/:issue`, `/api/v1/dispatch`, and `/questions`. That keeps a local self-HTTP loop inside one process even though the selected-run projection and observability presenters already exist as internal read-side boundaries.
- Desired Outcome: move Telegram read flows onto a fresh in-process read adapter that reuses CO's selected-run/observability boundaries directly, while preserving the current operator-visible Telegram behavior and leaving the existing `/control/action` write path intact for now.
- Scope Status: docs-first implementation stream for task `1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and keep delivering the remaining open Symphony-aligned slices end to end.
- Use the real `openai/symphony` repo as the architecture reference, but implement CO's own hardened version.
- Keep CO execution authority, non-mutating Linear posture, and bounded Telegram oversight intact.
- Prefer small, high-leverage refactors over broad churn, and keep delegation/evidence explicit.

## Baseline and Gap
- `1015` centralized selected-run projection in `selectedRunProjection.ts`.
- `1018` extracted the read-side observability surface.
- `1019` and `1020` completed the main presenter/controller split for read-only observability routes, including `/api/v1/dispatch`.
- The largest remaining local architectural mismatch is Telegram:
  - `telegramOversightBridge.ts` still fetches CO's own HTTP endpoints for state, issue, dispatch, and questions,
  - `notifyProjectionDelta(...)` still hashes/renderers off those self-fetches,
  - the bridge keeps `manifestPath` logic only because it cannot ask a shared in-process reader for the current issue identifier.

## Goals
- Introduce a Telegram-facing in-process read adapter for:
  - state,
  - issue,
  - dispatch,
  - questions,
  - current issue identifier resolution.
- Keep bridge reads fresh per call instead of holding one long-lived memoized selected-run projection reader.
- Preserve Telegram command behavior for `/status`, `/issue`, `/dispatch`, `/questions`, and projection-push notifications.
- Preserve `/pause` and `/resume` on the existing `/control/action` HTTP path in this slice.

## Non-Goals
- No Telegram mutation-path rewrite in this slice.
- No external HTTP endpoint removal.
- No auth/session/SSE/webhook refactor.
- No Linear authority widening or provider-behavior change.
- No BEAM/Elixir runtime work.

## Stakeholders
- Product: CO operator and future downstream CO users interacting through Telegram as an oversight/control surface.
- Engineering: CO control-surface maintainers.
- Operations: operators relying on stable Telegram status/issue/dispatch/question visibility and bounded control actions.

## Metrics & Guardrails
- Primary Success Metrics:
  - Telegram read paths no longer fetch CO's own local HTTP read endpoints,
  - operator-visible Telegram behavior remains coherent,
  - pause/resume transport behavior remains unchanged.
- Guardrails / Error Budgets:
  - no authority widening,
  - no repo-stored secrets,
  - no regression in push-delta dedupe/cooldown behavior,
  - no regression in transport nonce/idempotency/traceability for pause/resume.

## User Experience
- Personas:
  - CO operator using Telegram for status and bounded control.
  - future downstream CO user consuming the same projection-backed Telegram surface.
- User Journeys:
  - `/status`, `/issue`, `/dispatch`, and `/questions` return the same information without CO self-calling its own HTTP layer,
  - push notifications remain projection-driven and deduped,
  - `/pause` and `/resume` still apply through the hardened transport policy path.

## Technical Considerations
- Architectural Notes:
  - use Symphony's snapshot-first reuse pattern as the structural reference: one internal read model/presenter can feed multiple surfaces without local HTTP round-trips,
  - do not keep one long-lived `SelectedRunProjectionReader` inside the Telegram bridge because its memoized promises would go stale across bridge lifetime,
  - keep the mutation path separate for now because `/control/action` already carries the hardened transport/idempotency/traceability behavior.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/telegramOversightBridge.ts`
  - `orchestrator/src/cli/control/controlServer.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/questions.ts`
  - real `openai/symphony` controller/presenter/dashboard/pubsub files as read-only reference only.

## Open Questions
- Whether the in-process adapter should live as a Telegram-local interface in `telegramOversightBridge.ts` or as a tiny shared helper beside the control server.
- Whether the follow-on slice after this one should eliminate the remaining Telegram write-side self-HTTP path by extracting a direct control-action service, or whether the better next step is an internal observability notifier closer to Symphony's PubSub model.

## Approvals
- Product: Codex (per user-approved continuing slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
