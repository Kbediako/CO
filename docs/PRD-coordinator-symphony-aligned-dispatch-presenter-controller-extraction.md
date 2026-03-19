# PRD - Coordinator Symphony-Aligned Dispatch Presenter/Controller Extraction (1020)

## Summary
- Problem Statement: `1019` completed the presenter/controller split for state, issue, refresh, and UI, but `/api/v1/dispatch` still lives as the last main read-only outlier inside `controlServer.ts`, mixing method gating, dispatch-pilot evaluation, payload shaping, error payload construction, and audit emission in one route body.
- Desired Outcome: move dispatch payload shaping and failure classification behind the same presenter-style boundary used for the other read-only observability routes, while keeping HTTP method/status handling and audit emission in `controlServer.ts`.
- Scope Status: docs-first implementation stream for task `1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and keep delivering the remaining open Symphony-aligned slices end to end.
- Use the real `openai/symphony` repo as the architecture reference, but implement CO’s own hardened version.
- Keep CO execution authority, non-mutating Linear posture, and bounded Telegram oversight intact.
- Prefer small, high-leverage refactors over broad churn.

## Baseline and Gap
- `1015` centralized selected-run projection in `selectedRunProjection.ts`.
- `1018` extracted `observabilitySurface.ts` for read-only payload shaping.
- `1019` made that surface payload-oriented for state, issue, refresh, and UI, and returned HTTP ownership for those routes to `controlServer.ts`.
- The remaining read-only seam is `/api/v1/dispatch`:
  - `controlServer.ts` still performs dispatch-pilot evaluation, dispatch payload shaping, fail-closed error shaping, and success response construction inline,
  - dispatch-specific traceability/error shaping is still route-local instead of presenter-oriented,
  - the read-only observability surface remains asymmetrical because dispatch did not join the extracted boundary.

## Goals
- Add a presenter-oriented dispatch payload function behind `observabilitySurface.ts` or a tightly related read-side module.
- Keep `controlServer.ts` responsible for:
  - `GET` method gating,
  - status-code selection,
  - response headers,
  - audit-event emission.
- Preserve current public behavior for `GET /api/v1/dispatch`, including fail-closed dispatch outcomes.
- Keep state/issue/refresh/UI behavior unchanged.

## Non-Goals
- No Telegram rendering rewrite.
- No mutating-control or confirmation-flow changes.
- No live Linear authority or ingress redesign.
- No auth/session/webhook/SSE refactor.
- No broad helper deduplication unless required by the dispatch extraction itself.

## Stakeholders
- Product: CO operator and future downstream CO users consuming dispatch guidance through read-only surfaces.
- Engineering: CO control-surface maintainers.
- Operations: operators relying on fail-closed dispatch guidance and auditable dispatch-pilot events.

## Metrics & Guardrails
- Primary Success Metrics:
  - `/api/v1/dispatch` no longer shapes its payload/error body inline inside `controlServer.ts`,
  - controller code remains responsible for method/status/header/audit behavior,
  - dispatch public behavior and fail-closed posture remain unchanged.
- Guardrails / Error Budgets:
  - no authority widening,
  - no mutation side effects,
  - no route regressions for dispatch or the previously extracted observability routes,
  - no repo-stored secrets.

## User Experience
- Personas:
  - CO operator reading dispatch guidance.
  - future downstream CO user consuming the same advisory dispatch surface through UI or Telegram-adjacent status flows.
- User Journeys:
  - a dispatch read returns the same recommendation/fail-closed behavior as before,
  - blocked/fail-closed dispatch outcomes remain explicit and traceable,
  - future read-only surfaces can reuse the same dispatch presenter output without depending on controller internals.

## Technical Considerations
- Architectural Notes:
  - use Symphony’s controller/presenter layering as the structural reference, even though Symphony does not have a direct `/dispatch` route,
  - keep `SelectedRunProjectionReader` and `readDispatchEvaluation(...)` as the data/evaluation boundary,
  - preserve `emitDispatchPilotAuditEvents(...)` in the controller layer.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/controlServer.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/trackerDispatchPilot.ts`
  - real `openai/symphony` controller/presenter files as read-only reference only.

## Open Questions
- Whether the dispatch presenter function should live inside `observabilitySurface.ts` or in a tiny adjacent read-only module if that keeps the surface cleaner.
- Whether dispatch-specific traceability/error helpers should stay controller-local or move into a narrowly scoped helper beside the controller.

## Approvals
- Product: Codex (per user-approved continuing slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
