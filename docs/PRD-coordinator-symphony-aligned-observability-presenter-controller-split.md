# PRD - Coordinator Symphony-Aligned Observability Presenter/Controller Split (1019)

## Summary
- Problem Statement: `1018` extracted a dedicated `observabilitySurface.ts`, but that module still accepts HTTP methods, returns status/header/body triples, and shapes compatibility error responses. The read-side boundary is improved, but it is still a presenter-plus-controller hybrid rather than the thinner Symphony-style split.
- Desired Outcome: make `observabilitySurface.ts` payload-oriented and move method/status/header/error mapping back to `controlServer.ts` or a tiny route-local adapter, while preserving current route behavior and CO’s authority model.
- Scope Status: docs-first implementation stream for task `1019-coordinator-symphony-aligned-observability-presenter-controller-split`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and keep delivering the remaining open Symphony-aligned slices end to end.
- Use the real `openai/symphony` repo as the architecture reference, but implement CO’s own hardened version.
- Keep Telegram and Linear under CO’s stricter authority model; do not widen mutation scope or adopt unattended workflow behavior.
- Prefer larger refactors only when they are still bounded, evidenced, and materially improve the control-surface architecture.

## Baseline and Gap
- `1017` extracted selected-run projection into `selectedRunProjection.ts`.
- `1018` moved read-only state/issue/refresh/UI shaping into `observabilitySurface.ts` and left `controlServer.ts` as the auth/route/webhook/mutation host.
- The remaining gap is the controller/presenter seam:
  - `observabilitySurface.ts` still receives request methods and returns HTTP-shaped `{ status, headers, body }` responses,
  - compatibility method-not-allowed, route-not-found, and read-only rejection outcomes are still effectively owned by the surface layer,
  - `controlServer.ts` still depends on controller-flavored helpers exported from the surface instead of a simpler payload boundary.

## Goals
- Make `observabilitySurface.ts` payload-oriented for:
  - `state`,
  - `issue`,
  - `refresh acknowledgement / rejection classification`,
  - `ui data`.
- Move HTTP method gating, status-code selection, response headers, and compatibility route not-found handling back into `controlServer.ts` or a tiny local adapter beside it.
- Preserve current public behavior for `/api/v1/state`, `/api/v1/:issue`, `/api/v1/refresh`, and `/ui/data.json`.
- Keep `/api/v1/dispatch`, auth/session, webhook ingress, SSE, and mutation paths outside this slice.

## Non-Goals
- No `/api/v1/dispatch` redesign in this slice.
- No Telegram rendering rewrite.
- No Linear authority changes or live-ingress redesign.
- No new env vars, secrets, storage contracts, or bridge capabilities.
- No broad deduplication/refactor beyond what is minimally required for the controller/presenter split.

## Stakeholders
- Product: CO operator and future downstream CO users consuming read-only status surfaces.
- Engineering: CO control-surface maintainers.
- Operations: operators relying on deterministic compatibility/UI payloads and explicit traceability.

## Metrics & Guardrails
- Primary Success Metrics:
  - `observabilitySurface.ts` no longer returns HTTP-shaped response objects,
  - `controlServer.ts` clearly owns method/status/header mapping for the covered read-only routes,
  - read-only route behavior stays unchanged.
- Guardrails / Error Budgets:
  - no authority widening,
  - no route regressions on state/issue/refresh/UI paths,
  - no new long-lived caches,
  - no mutation/webhook coupling to the presenter layer,
  - no repo-stored secrets.

## User Experience
- Personas:
  - CO operator reading status surfaces.
  - future downstream CO user consuming the same bounded read-only routes through UI or Telegram-adjacent status flows.
- User Journeys:
  - a status/issue/UI request still returns coherent selected-run data,
  - a refresh acknowledgement or rejection stays explicit and traceable,
  - future surfaces can depend on presenter payloads instead of controller internals.

## Technical Considerations
- Architectural Notes:
  - use Symphony’s `ObservabilityApiController` plus `Presenter` split as the structural reference,
  - keep `SelectedRunProjectionReader` as the selected-run data boundary,
  - keep CO’s harder authority and local control semantics unchanged.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/controlServer.ts`,
  - `orchestrator/src/cli/control/observabilitySurface.ts`,
  - `orchestrator/src/cli/control/selectedRunProjection.ts`,
  - `openai/symphony` `presenter.ex` and `observability_api_controller.ex`.

## Open Questions
- Whether compatibility traceability/error payload builders should live in `controlServer.ts` directly or in a tiny controller-local helper.
- Whether tracked/manifest helper deduplication should stay out of scope entirely unless the split naturally forces it.

## Approvals
- Product: Codex (per user-approved continuing slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
