# PRD - Coordinator Live Linear Advisory Ingress + Telegram Delta Notifications (1016)

## Summary
- Problem Statement: `1015` centralized the selected-run projection, but live Linear updates still depend on request-time provider fetches or manually supplied metadata, and Telegram oversight remains pull-only. Operators and future downstream CO users need bounded push visibility for material run/advisory changes without widening authority.
- Desired Outcome: add a fail-closed live Linear advisory ingress path that persists accepted event state per run, merge that state into the shared selected-run projection, and emit bounded Telegram delta notifications from the same projection.
- Scope Status: docs-first implementation stream for task `1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the Orchestrator and carry the approved next slice through implementation, validation, closeout, and commit hygiene.
- Keep Telegram and Linear under top-level CO control; configure Linear as needed for the feature to work.
- Treat Symphony as a valuable product reference, not an authority transfer target.
- Keep the Telegram bot as an oversight/control surface that could later ship to downstream CO users.
- Use the endorsed async `ControlServer` direction where it helps live Linear data and Telegram oversight stay aligned.
- Preserve the coordinator boundaries:
  - CO remains execution authority,
  - Coordinator remains intake/control bridge only,
  - Linear remains advisory-only and non-mutating,
  - Telegram remains bounded and allowlisted,
  - no scheduler ownership transfer.

## Baseline and Gap
- `1014` shipped the provider-backed Telegram polling bridge and live Linear advisory lookups.
- `1015` unified selected-run projection across `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and Telegram `/status` / `/issue`.
- The remaining gap is event flow:
  - there is no live inbound Linear event path,
  - there is no per-run accepted Linear delivery state or replay ledger,
  - Telegram only speaks when asked instead of notifying on material selected-run deltas,
  - downstream users cannot yet get the combined Symphony-like “live advisory + operator oversight” experience through CO.

## Goals
- Add a fail-closed Linear ingress route for signed webhook deliveries.
- Validate inbound deliveries against configured workspace/team/project scope before the event is accepted into CO runtime state.
- Persist accepted advisory event state and replay/idempotency metadata beside the active run artifacts.
- Feed the latest accepted advisory event into the shared selected-run projection and read-side control surfaces.
- Emit bounded Telegram push notifications for material selected-run deltas using the same shared projection.
- Verify the feature against the real Linear and Telegram credentials already prepared for CO, using live provider calls where the current environment allows and simulated signed ingress where a public endpoint is absent.

## Non-Goals
- Linear mutations, issue transitions, comments, status writes, or authority transfer.
- A new public multi-tenant Telegram router or downstream auth redesign.
- Discord work.
- Symphony desktop inventory, UI-owned selection, or auto-approval posture.
- Long-lived deployment or tunnel automation inside this slice; the route should be ready for forwarding, but stable public exposure stays a deployment concern.

## Stakeholders
- Product: CO operator and future downstream CO users consuming Telegram oversight.
- Engineering: CO control-surface maintainers.
- Operations: local and app-server operators wiring external ingress to the control server.

## Metrics & Guardrails
- Primary Success Metrics:
  - accepted Linear deliveries update the selected-run projection without widening authority,
  - malformed deliveries are rejected while replay or out-of-scope deliveries are safely ignored without mutating state, and all outcomes remain auditable,
  - Telegram push notifications fire for material selected-run changes and avoid duplicate spam,
  - existing `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and Telegram `/status` / `/issue` stay coherent with the same selected run.
- Guardrails / Error Budgets:
  - no repo-stored secrets,
  - no Linear-authoritative behavior,
  - no unbounded background fanout,
  - no bypass of the shared selected-run projection introduced in `1015`.

## User Experience
- Personas:
  - CO operator watching one active run through Telegram plus local control surfaces.
  - future downstream CO user receiving bounded oversight notifications from the same bot surface.
- User Journeys:
  - a relevant Linear issue event arrives and is reflected in the selected-run advisory context without requiring a fresh on-demand fetch,
  - a run pauses, awaits input, resumes, or changes advisory context and Telegram can notify the allowlisted operator chat without duplicate noise,
  - the operator can still inspect `/api/v1/state`, `/api/v1/:issue`, and Telegram commands and see the same authoritative selected-run state.

## Technical Considerations
- Architectural Notes:
  - add a bounded inbound Linear webhook route at the control-server boundary, outside the read-only `/api/v1` compatibility surface,
  - persist run-local Linear advisory ingress state and Telegram push cursor state under the current run directory,
  - keep Telegram push rendering projection-driven rather than inventing a second formatter,
  - support manual/live verification even when a stable public endpoint is not yet deployed by allowing local signed ingress simulation.
- Dependencies / Integrations:
  - existing `ControlServer`, selected-run builder, Telegram oversight bridge, and run event stream,
  - existing real Telegram bot token/chat and Linear API credentials,
  - real Linear webhook secret once configured,
  - real `openai/symphony` repo/checkout as read-only reference for the Linear skill, Linear client, and shared projection model only; it is not a Telegram or webhook-ingress source.

## Open Questions
- Which selected-run deltas are materially important enough to push to Telegram by default versus remaining pull-only in `/status` and `/issue` responses.
- Whether accepted Linear ingress state should be exposed through `/api/v1/dispatch` immediately in this slice or remain strictly selected-run/issue/UI scoped until a follow-up.

## Approvals
- Product: Codex (per user-approved new and future slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
