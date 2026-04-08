# PRD - Coordinator Symphony-Aligned Control Runtime Boundary Extraction (1023)

## Summary
- Problem Statement: after `1017` through `1022`, CO's read-side seams are cleaner, but the runtime is still `ControlServer`-centric. `controlServer.ts` seeds runtime state, creates selected-run/read-model handles, owns observability notifier lifecycle, and wires Telegram directly to those internals. Real Symphony keeps lifecycle/state in an orchestrator boundary and makes controllers/dashboard consumers thin readers of a shared runtime/presenter contract.
- Desired Outcome: extract a dedicated internal control runtime boundary that owns shared snapshot/read-model assembly plus real refresh/subscribe semantics, so HTTP/UI/Telegram surfaces consume one hardened runtime contract instead of reassembling state inside `ControlServer`.
- Scope Status: docs-first implementation stream for task `1023-coordinator-symphony-aligned-control-runtime-boundary-extraction`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and keep delivering the current Symphony-aligned CO slices end to end.
- Use the real `openai/symphony` repo as the reference and be open to larger refactors when they materially improve the architecture.
- Keep Telegram and Linear fully under CO control.
- Preserve CO's harder authority model:
  - CO remains execution authority,
  - Linear remains advisory-only and fail-closed,
  - Telegram remains bounded and allowlisted,
  - no scheduler ownership transfer.

## Baseline and Gap
- `1017` extracted selected-run projection plus async live Linear dispatch evaluation.
- `1018` through `1020` pulled read-side presenter/controller seams out of `controlServer.ts`.
- `1021` moved Telegram reads off in-process self-HTTP.
- `1022` removed Telegram-specific observability update coupling through a generic notifier.
- Those slices were useful cleanup, but the real remaining mismatch is structural:
  - `controlServer.ts` still owns runtime composition,
  - HTTP/UI/Telegram surfaces still depend on runtime pieces assembled inside that class,
  - live Linear tracked context still enters read paths through a request-time runtime assembly owned by `ControlServer`.
- Real Symphony guidance reinforces a stronger seam:
  - `Orchestrator` owns runtime state and lifecycle,
  - `Presenter` reads that state and shapes shared payloads,
  - controllers and dashboard consumers stay thin,
  - upstream explicitly recommends implementing a hardened version from that pattern rather than shipping the prototype literally.
- Real Symphony also exposes refresh as a real reconcile trigger, while CO's current compatibility refresh path only acknowledges the request without asking any shared runtime boundary to invalidate or warm state.

## Goals
- Extract a dedicated internal control runtime module under `orchestrator/src/cli/control/`.
- Expose a shared runtime contract closer to Symphony's `snapshot()/requestRefresh()/subscribe()` shape:
  - snapshot/read methods for state/issue/dispatch/UI consumers,
  - a refresh request boundary that invalidates and re-warms the shared read session,
  - subscription/publication hooks for observability updates.
- Move selected-run projection, observability-surface construction, and notifier lifecycle behind that boundary.
- Make HTTP/UI/Telegram consumers depend on the shared runtime contract instead of locally assembling runtime handles inside `ControlServer`.
- Prepare the later live Linear cache/ingress follow-up without widening authority in this lane.

## Non-Goals
- No authority widening or Linear mutations.
- No Telegram command redesign or transport changes.
- No queue, worker, or distributed runtime in this slice.
- No live Linear cache/poller yet.
- No `/control/action` auth/idempotency extraction in this lane.
- No Elixir/BEAM rewrite.

## Stakeholders
- Product: CO operators and future downstream CO users consuming Telegram-backed oversight plus Linear-backed advisory context.
- Engineering: CO control-surface maintainers.
- Operations: operators who need one coherent runtime boundary feeding all read surfaces instead of another `ControlServer`-local assembly seam.

## Metrics & Guardrails
- Primary Success Metrics:
  - `controlServer.ts` no longer owns shared runtime composition for read surfaces and observability subscriptions,
  - state/issue/dispatch/UI/Telegram consumers rely on one shared internal runtime boundary,
  - refresh and observability update hooks are exposed through that runtime contract without behavior regression,
  - `POST /api/v1/refresh` drives a bounded runtime refresh instead of a route-local acknowledgment only.
- Guardrails / Error Budgets:
  - no repo-stored secrets,
  - no new mutation authority,
  - no silent behavior changes to current read/refresh/update behavior,
  - no new public HTTP surface.

## User Experience
- Personas:
  - CO operator checking state/issue/dispatch through Telegram or local read surfaces.
  - future downstream CO user receiving the same bounded advisory context.
- User Journeys:
  - state/issue/dispatch/UI/Telegram surfaces continue to agree on the same selected-run and advisory context,
  - refresh remains bounded and coherent,
  - future async Linear cache/ingress work can plug into the runtime boundary instead of growing `ControlServer`.

## Technical Considerations
- Architectural Notes:
  - use real Symphony as structural guidance only: isolate runtime state from presenter/controller consumers and keep hardening explicit,
  - introduce a `ControlRuntime`-style boundary that can own projection/observability assembly and observability subscriptions,
  - keep the boundary internal and synchronous from the route host's perspective while still allowing refresh to invalidate and warm the shared read session,
  - do not yet introduce a queue or cache service.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/controlServer.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - existing Linear advisory state sidecar and observability notifier
  - real `openai/symphony` `SPEC.md`, `elixir/lib/symphony_elixir/orchestrator.ex`, `elixir/lib/symphony_elixir_web/presenter.ex`, `elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, and the upstream Linear skill contract as read-only reference only

## Open Questions
- Whether the follow-up after this extraction should move live Linear tracked context behind a refreshable cache/poller or extract the remaining route/protocol guards from `controlServer.ts`.
- Whether the runtime boundary should expose only surface-specific read methods in this slice, or also a lower-level shared snapshot object for later presenter work.

## Approvals
- Product: Codex (per user-approved current and future slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
