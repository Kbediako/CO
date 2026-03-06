# PRD - Coordinator Symphony-Aligned Selected-Run Projection + Advisory Context (1015)

## Summary
- Problem Statement: `1014` shipped the real Telegram and Linear adapters, but the selected-run view is still assembled through separate control, issue, UI, and Telegram code paths, so paused/completed/failed runs and live Linear advisory refreshes can drift across surfaces.
- Desired Outcome: one shared selected-run context builder keeps the CO run/task authoritative while projecting the same status, recent context, and tracked Linear advisory details through `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and Telegram `/status` / `/issue`.
- Scope Status: docs-first implementation stream for task `1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and carry the Symphony-alignment work forward without reopening the older adapter slice.
- Use Symphony as a behavior reference for a better active-item projection and async refresh discipline, not as an authority model.
- Keep Telegram as the operator-facing oversight surface that downstream CO users could eventually use.
- Configure Linear as required so live advisory context resolves against the real workspace/team/project and stays consistent across the control surface.
- Treat the suggested async `ControlServer` path as in scope when it helps keep live Linear fetches and selected-run projection aligned.
- Preserve the closed coordinator boundaries:
  - CO remains execution authority,
  - Coordinator remains intake/control bridge only,
  - Linear remains advisory-only,
  - no scheduler ownership transfer,
  - no import of Symphony desktop inventory or lower-guardrail defaults.

## Baseline and Gap
- `1014` added the provider-backed Telegram polling bridge and live Linear advisory resolution.
- The current gap is projection coherence:
  - `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and Telegram rendering still compose overlapping but not identical status/advisory summaries,
  - live Linear refresh is provider-backed but not yet centralized behind one selected-run projection contract,
  - idle/paused/completed/failed runs should still retain a stable operator-visible selected item rather than collapsing to sparse status framing.

## Goals
- Introduce one shared selected-run context builder for the control surface.
- Keep active-run identity stable even when the selected run is paused, failed, succeeded, or awaiting input.
- Surface bounded recent context:
  - latest run summary,
  - latest meaningful control event or transport action,
  - question queue status,
  - tracked Linear advisory summary and recent activity when available.
- Reuse the same projection in control APIs, UI data, and Telegram status/issue rendering.
- Keep live Linear resolution configured against the real workspace/team/project with bounded async request behavior and fail-closed results.

## Non-Goals
- Public Telegram webhook ingress or a global multi-run Telegram router.
- Linear mutation, comment posting, issue transitions, or authority transfer.
- Symphony desktop repo/group/branch/host inventory.
- Discord work or any new transport surface.
- Arbitrary bot command execution beyond the already-bounded oversight controls.

## Stakeholders
- Product: CO operator and future downstream CO operators using Telegram oversight.
- Engineering: CO control-surface maintainers.
- Design: operator-facing state/issue presentation only; no new frontend surface beyond existing compatibility data.

## Metrics & Guardrails
- Primary Success Metrics:
  - selected-run state/issue/UI/Telegram projections stay coherent for the same run,
  - paused/succeeded/failed runs remain legible instead of losing active-item framing,
  - live Linear advisory context resolves consistently and fails closed on provider/config errors.
- Guardrails / Error Budgets:
  - no widening of execution authority,
  - no repo-stored secrets,
  - no Linear-authoritative behavior,
  - bounded provider latency so read surfaces do not hang.

## User Experience
- Personas:
  - CO operator managing one active run through local control surfaces and Telegram.
  - future downstream CO user consuming the same oversight/status framing through Telegram.
- User Journeys:
  - open `/api/v1/state` and Telegram `/status` and see the same authoritative selected-run summary,
  - inspect `/api/v1/:issue`, `/ui/data.json`, and Telegram `/issue` and see the same tracked Linear advisory context,
  - pause or resume a run, then continue seeing the same selected item with updated recent context rather than a mismatched or empty projection.

## Technical Considerations
- Architectural Notes:
  - centralize selected-run projection in the control surface instead of duplicating formatting logic,
  - allow the builder to perform bounded async advisory refresh so state/issue/UI/Telegram stay aligned on the same provider-backed snapshot,
  - preserve existing control/action and dispatch-pilot authority boundaries.
- Dependencies / Integrations:
  - existing `ControlServer`, Telegram oversight bridge, and dispatch pilot runtime,
  - real Linear workspace/team/project and token supplied via env for validation,
  - Symphony checkout at `/Users/kbediako/Code/symphony` as behavior reference only.

## Open Questions
- Whether the shared builder should also own `/questions` summary shaping now, or only expose question metadata that Telegram and `/api/v1/state` can each render.

## Approvals
- Product: Codex (per user-approved new and future slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
