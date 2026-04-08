# PRD - Coordinator Symphony-Aligned Projection Boundary + Live Linear Refresh (1017)

## Summary
- Problem Statement: `1015` and `1016` landed the shared selected-run behavior, live Linear advisory ingress, and Telegram delta push, but `controlServer.ts` still owns selected-run snapshot reading, async dispatch/live Linear evaluation, compatibility payload shaping, and UI dataset assembly in one file. That concentration makes future Telegram/downstream-user surfaces brittle and obscures the Symphony-aligned projection boundary we actually want to keep stable.
- Desired Outcome: extract a dedicated selected-run projection boundary that owns async live Linear evaluation and shared public payload shaping for state, issue, UI, and dispatch surfaces without widening CO authority or changing the Telegram/Linear control model.
- Scope Status: docs-first implementation stream for task `1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and take the next approved slice through implementation, validation, closeout, and commit hygiene.
- Use the real `openai/symphony` repo as a reference for the architecture decisions and be open to larger refactors when they genuinely reduce long-term complexity.
- Keep Telegram and Linear fully under CO control; configure Linear as needed for the shipped runtime behavior.
- Treat the user-endorsed async live Linear path as a feature of the projection/control boundary, not a reason to broaden authority or add unattended mutations.
- Preserve the existing guardrails:
  - CO remains execution authority,
  - Coordinator remains intake/control bridge only,
  - Linear remains advisory-only and non-mutating,
  - Telegram remains bounded and allowlisted,
  - no scheduler ownership transfer.

## Baseline and Gap
- `1014` delivered the bounded provider-backed Telegram and Linear adapters.
- `1015` established one shared selected-run context across `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and Telegram `/status` / `/issue`.
- `1016` added fail-closed live Linear webhook ingress and projection-driven Telegram push deltas.
- The remaining gap is layering:
  - `controlServer.ts` still owns too much of the selected-run projection logic,
  - async live Linear evaluation is conceptually part of the projection boundary but still embedded in the route host,
  - future downstream Telegram surfaces would inherit that concentration if we leave it in place.

## Goals
- Extract the selected-run projection logic into a dedicated control-surface module with a narrow dependency boundary.
- Keep async live Linear dispatch/advisory evaluation inside that projection boundary so read surfaces stay coherent.
- Reuse the extracted boundary for `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and `/api/v1/dispatch`.
- Preserve current webhook ingress and Telegram push behavior while removing avoidable projection logic from `controlServer.ts`.
- Add focused tests that prove coherence and avoid duplicate live Linear evaluation within one request/build path.

## Non-Goals
- New webhook routes or broader Linear mutation capabilities.
- Broader Telegram mutation scope or downstream auth redesign.
- Replacing Node/TypeScript with Elixir.
- Adopting Symphony's unattended approval posture or tracker-authoritative workflow.
- UI redesign.

## Stakeholders
- Product: CO operator and future downstream CO users receiving Telegram oversight.
- Engineering: CO control-surface maintainers.
- Operations: local and app-server operators who need stable observability and advisory behavior.

## Metrics & Guardrails
- Primary Success Metrics:
  - `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and `/api/v1/dispatch` continue to agree on the same selected run and tracked advisory context,
  - `controlServer.ts` sheds the selected-run projection logic into a dedicated module without behavior regression,
  - live Linear provider fetches remain bounded and coherent within the extracted projection flow.
- Guardrails / Error Budgets:
  - no new authority or mutating surfaces,
  - no repo-stored secrets,
  - no duplicated formatter/projection logic reintroduced elsewhere,
  - no change to the existing Telegram allowlist and bounded controls.

## User Experience
- Personas:
  - CO operator using Telegram plus local control/read surfaces.
  - future downstream CO user consuming the same bounded oversight surface.
- User Journeys:
  - an operator checks `/api/v1/state`, `/api/v1/:issue`, or Telegram and sees the same selected-run summary and tracked Linear context,
  - a live Linear-backed dispatch/advisory lookup occurs without causing mismatched state across read surfaces,
  - future slices can extend downstream-facing surfaces from the extracted projection boundary rather than from `controlServer.ts` internals.

## Technical Considerations
- Architectural Notes:
  - introduce a dedicated selected-run projection module under `orchestrator/src/cli/control/`,
  - keep `controlServer.ts` responsible for routing/auth and delegate projection assembly to the extracted boundary,
  - keep async live Linear evaluation inside the projection flow, with request-scoped memoization where it prevents duplicate provider work,
  - preserve webhook ingress and Telegram push integration by feeding the same extracted projection outputs.
- Dependencies / Integrations:
  - existing `ControlServer`, `linearDispatchSource`, Telegram oversight bridge, and run-local advisory sidecars,
  - real `openai/symphony` repo/checkout as a read-only reference for projection layering and poll-and-project Linear discipline only.

## Open Questions
- Whether `/api/v1/dispatch` should fully consume the extracted projection boundary in this slice or continue as a thin specialized read path plus shared async evaluation helper.
- Whether a follow-up should move Telegram rendering off HTTP self-calls and onto the extracted projection boundary directly, once this module exists.

## Approvals
- Product: Codex (per user-approved new and future slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
