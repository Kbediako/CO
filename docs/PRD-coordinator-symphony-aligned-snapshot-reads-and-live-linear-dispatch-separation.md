# PRD - Coordinator Symphony-Aligned Snapshot Reads + Live Linear Dispatch Separation (1024)

## Summary
- Problem Statement: after `1023`, CO has a shared control runtime boundary, but the synchronous snapshot/read surfaces still warm provider-backed live Linear advisory evaluation and synthesize `tracked` payloads from dispatch recommendations. That violates the real Symphony guidance that synchronous runtime snapshots should draw from orchestrator state only, makes invalid-signature/out-of-scope webhook tests network-sensitive, and blurs accepted advisory context with provisional dispatch recommendations.
- Desired Outcome: move live Linear advisory evaluation behind a bounded runtime-owned advisory cache, keep state/issue/UI/Telegram snapshot surfaces cache-only and runtime-state-only, stop deriving `tracked` from live dispatch recommendations, and preserve explicit live advisory evaluation behind the dispatch-specific path until a later poller/cadence slice is intentionally introduced.
- Scope Status: docs-first implementation stream for task `1024-coordinator-symphony-aligned-snapshot-reads-and-live-linear-dispatch-separation`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and keep delivering the current Symphony-aligned CO slices end to end.
- Use the real `openai/symphony` repo as the primary architectural reference and correct old assumptions where needed.
- Be open to larger refactors when they materially improve the architecture, but keep each slice bounded and evidence-backed.
- Preserve CO's harder authority model:
  - CO remains execution authority,
  - Linear remains advisory-only and fail-closed,
  - Telegram remains bounded and allowlisted,
  - no scheduler ownership transfer.
- Treat the user's async live-Linear-fetch idea as the correct direction, but land it in the smallest bounded form first: runtime-owned advisory cache plus explicit dispatch-only live reads.

## Baseline and Gap
- `1017` intentionally kept request-scoped async live Linear evaluation inside the selected-run projection boundary.
- `1018` through `1023` extracted observability, presenter/controller, Telegram read-model reuse, notifier, and runtime composition seams, but did not change the meaning of snapshot data.
- Today the remaining mismatch is semantic rather than structural:
  - `/api/v1/state` still invokes async live dispatch evaluation during runtime warm,
  - `selectedRunProjection.ts` and `observabilitySurface.ts` can derive `tracked` from `dispatchPilotEvaluation.recommendation.tracked_issue` even when no advisory ingress was accepted,
  - invalid-signature and out-of-scope Linear webhook tests become network-sensitive unless fetch is stubbed,
  - synchronous read surfaces are no longer "runtime snapshot only" in the Symphony sense.
- Real Symphony guidance is stricter:
  - the orchestrator owns authoritative runtime state,
  - synchronous snapshot/dashboard surfaces should draw from that runtime state only,
  - explicit refresh or dispatch-style flows can do more work, but human-readable status surfaces should not require live provider reads.
- Delegated real-Symphony research and local failure analysis both converged on the same next move:
  - the real bug is the runtime boundary, not the payload contract,
  - `selectedRunProjection.ts` should become provider-free again,
  - the minimal fix is a bounded runtime-owned advisory cache plus explicit dispatch-only live reads.

## Goals
- Keep `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and Telegram state/issue readers free of live Linear provider reads.
- Introduce a bounded runtime-owned live Linear advisory cache with single-flight refresh behavior.
- Stop deriving `tracked` payloads from provisional dispatch recommendations on snapshot surfaces.
- Preserve explicit live advisory evaluation for the dispatch-specific read path.
- Keep dispatch pilot configuration/status visibility available on snapshot surfaces without requiring provider I/O.
- Make the existing live-Linear ingress tests deterministic again without widening authority or adding a background service.

## Non-Goals
- No Linear mutations or authority widening.
- No Telegram command redesign or transport changes.
- No poller cadence or long-lived background worker in this slice.
- No broader route/auth extraction from `controlServer.ts`.
- No attempt to collapse dispatch, ingress, and accepted advisory context into one surface.
- No Elixir/BEAM rewrite.

## Stakeholders
- Product: CO operators and future downstream CO users who need Telegram and local read surfaces to show stable status without accidental provider coupling.
- Engineering: CO control/runtime maintainers.
- Operations: operators who need deterministic observability and tests while keeping explicit advisory reads available where they are semantically correct.

## Metrics & Guardrails
- Primary Success Metrics:
  - snapshot surfaces stop triggering live Linear provider reads,
  - `tracked` on snapshot/issue/UI/Telegram surfaces reflects accepted/persisted advisory context only,
  - explicit dispatch reads still produce live advisory recommendations and fail closed correctly,
  - the previously network-sensitive invalid-signature/out-of-scope ingress tests become deterministic without real fetches.
- Guardrails / Error Budgets:
  - no repo-stored secrets,
  - no new mutation authority,
  - no silent widening of dispatch/ingress semantics,
  - no new public HTTP surface,
  - no background worker/cache lifecycle in this lane.

## User Experience
- Personas:
  - CO operator checking state/issue/UI/Telegram status.
  - future downstream CO user relying on those surfaces for bounded oversight.
- User Journeys:
  - status snapshots remain fast and deterministic even when Linear credentials are configured,
  - ignored/rejected webhook deliveries do not "invent" tracked advisory context on snapshot reads,
  - explicit dispatch reads still provide live advisory recommendations when intentionally requested.

## Technical Considerations
- Architectural Notes:
  - use real Symphony as the source of truth for snapshot/presenter posture: synchronous snapshot surfaces should read orchestrator/runtime state only,
  - move provider-backed advisory work behind a bounded runtime-owned cache,
  - keep explicit provider-backed advisory awaits on the dispatch-specific path for now,
  - represent accepted advisory context separately from provisional dispatch recommendation context,
  - defer any true poller cadence or broader cache service until after the semantic split is stable.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/trackerDispatchPilot.ts`
  - existing Linear advisory ingress state sidecar
  - real `openai/symphony` `SPEC.md`, `elixir/lib/symphony_elixir/orchestrator.ex`, and `elixir/lib/symphony_elixir_web/presenter.ex` as read-only reference only

## Open Questions
- Whether the follow-up after this slice should add poller cadence around the advisory cache or keep refresh/webhook invalidation as the only refresh triggers.
- Whether snapshot surfaces should expose only dispatch policy summary, or a slightly richer non-provider advisory status object.

## Approvals
- Product: Codex (per user-approved current and future slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
