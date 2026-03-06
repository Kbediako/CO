# PRD - Coordinator Symphony-Aligned Observability Surface Extraction (1018)

## Summary
- Problem Statement: `1017` extracted selected-run projection into `selectedRunProjection.ts`, but `controlServer.ts` still owns the HTTP-facing response shaping for `/api/v1/state`, `/api/v1/:issue`, `/api/v1/refresh`, and `/ui/data.json`. That keeps the read-side observability surface coupled to the route host instead of to a stable presenter-style boundary.
- Desired Outcome: introduce a dedicated observability-surface module that owns read-only state/issue/refresh/UI response shaping from the selected-run projection boundary, leaving `controlServer.ts` as a thin router/auth/webhook/control host.
- Scope Status: docs-first implementation stream for task `1018-coordinator-symphony-aligned-observability-surface-extraction`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and take the next approved Symphony-aligned slice end to end.
- Use the real `openai/symphony` repo as the architecture reference, especially its thin observability controller plus presenter split.
- Keep Telegram and Linear under CO’s stricter authority model; do not copy Symphony’s unattended workflow posture.
- Prefer the smallest refactor that materially improves the long-term control-surface boundary.

## Baseline and Gap
- `1014` delivered bounded Telegram oversight and live Linear advisory adapters.
- `1015` centralized selected-run projection behavior.
- `1016` added live Linear ingress and Telegram delta notifications.
- `1017` extracted selected-run projection into `selectedRunProjection.ts` and removed duplicate live evaluation inside the `/api/v1/dispatch` request path.
- The remaining gap is the observability HTTP surface:
  - `controlServer.ts` still owns too much response construction for state/issue/refresh/UI routes,
  - compatibility error/traceability shaping for read-only routes remains mixed into the route host,
  - future downstream-user/status surfaces still have to read `controlServer.ts` internals instead of a stable presenter layer.

## Goals
- Extract a dedicated observability-surface module under `orchestrator/src/cli/control/`.
- Move `/api/v1/state`, `/api/v1/:issue`, `/api/v1/refresh`, and `/ui/data.json` payload shaping behind that module.
- Keep the new surface presenter-like: consume projection/context inputs and return response payloads/status decisions without owning auth or mutations.
- Preserve current read-surface behavior and authority semantics.
- Add focused tests or route-level coverage where the extraction changes the read-only surface behavior.

## Non-Goals
- Reworking webhook ingress or transport-mutation logic.
- Moving `/api/v1/dispatch` into this slice unless required by the minimal boundary.
- Telegram direct rendering changes.
- New mutating powers, new env vars, or new secret flows.
- Replacing Node/TypeScript with Elixir.

## Stakeholders
- Product: CO operator and future downstream CO users reading status surfaces.
- Engineering: CO control-surface maintainers.
- Operations: operators relying on consistent state/issue/UI responses and traceability.

## Metrics & Guardrails
- Primary Success Metrics:
  - `controlServer.ts` no longer owns the core response shaping for state/issue/refresh/UI routes,
  - read-only surfaces continue to agree on selected-run state and tracked advisory context,
  - compatibility error behavior stays coherent and explicit.
- Guardrails / Error Budgets:
  - no authority widening,
  - no route/response regressions for the covered read-only surfaces,
  - no new long-lived caches,
  - no repo-stored secrets,
  - no accidental coupling of webhook/mutation paths to the new observability module.

## User Experience
- Personas:
  - CO operator checking UI or compatibility routes.
  - future downstream CO user using the same bounded read surfaces.
- User Journeys:
  - a read-only route request returns the same selected-run/tracked context regardless of whether it came from the UI or compatibility API,
  - a not-found or read-only refresh acknowledgement uses the same coherent error/traceability shaping,
  - future status surfaces can reuse one observability boundary rather than re-reading `controlServer.ts` internals.

## Technical Considerations
- Architectural Notes:
  - add a dedicated observability-surface module that consumes `SelectedRunProjectionReader` and narrow request metadata,
  - keep `controlServer.ts` responsible for auth/session, route matching, webhook ingress, SSE wiring, and control mutations,
  - use Symphony’s presenter/controller split as the reference pattern, not as an authority model template.
- Dependencies / Integrations:
  - `selectedRunProjection.ts`,
  - `controlServer.ts`,
  - existing compatibility/read-only route payload and traceability helpers,
  - real `openai/symphony` presenter/controller files as read-only architecture guidance.

## Open Questions
- Whether compatibility error shaping for read-only routes should move with the presenter module in this slice or remain in `controlServer.ts` as long as payload constructors are extracted.
- Whether the route-not-found compatibility error belongs in the same observability module or should stay local to the router host.

## Approvals
- Product: Codex (per user-approved next and future slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
