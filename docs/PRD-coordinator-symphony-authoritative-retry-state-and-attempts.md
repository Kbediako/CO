# PRD - Coordinator Symphony Authoritative Retry State and Attempts

## Added by Bootstrap 2026-03-21

## Summary
- Problem Statement: after `1313`, the remaining backend/API parity blocker was the retry queue model. Upstream authority in `/Users/kbediako/Code/symphony/SPEC.md:1403-1454`, `/Users/kbediako/Code/symphony/SPEC.md:743-747`, and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:775-812,1130-1152` expects authoritative retry rows plus issue-level retry/attempt payloads with real `attempt`, `error`, and deadline semantics. The current branch now implements that bounded `1314` slice, but full hardened parity still remains blocked by the broader scheduler/timer ownership model.
- Desired Outcome: record `1314` truthfully as a delivered retry-state slice. CO now persists a real retry ledger/runtime source and threads it through `/api/v1/state.retrying`, `/api/v1/<issue>.retry`, and `/api/v1/<issue>.attempts`; the remaining scheduler-cadence gap stays explicit as a follow-on lane, not a hidden footnote.

## Status Update - 2026-03-22
- Current branch state: `1314` is implemented on this branch as part of the integrated `1312`/`1313`/`1314` publication unit.
- Current-head closeout summary for that integrated unit is `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`; older `20260321T124445Z-stacked-closeout` and `20260321T124510Z-stack-closeout` packs are stale for current-head validation.
- The truthful next slice remains `1315`: docs-review succeeded for `1315`, but `1315` implementation is not yet claimed from this branch packet.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): continue toward full hardened parity after `1313`, but do it truthfully by opening the next bounded slice for retry-state parity instead of claiming that running-row plus aggregate telemetry parity closes the whole backend/API contract.
- Success criteria / acceptance:
  - `1314` lands a real retry ledger/runtime seam in CO instead of presenter-only inference
  - `/api/v1/state.retrying`, `/api/v1/<issue>.retry`, and `/api/v1/<issue>.attempts` become authoritative for the bounded slice
  - normal post-success continuation does not fabricate retry attempts, while genuine retry-driven relaunches preserve truthful attempt numbers
  - the packet keeps strict scheduler ownership/cadence parity explicit instead of silently folding it into this slice
  - the packet leaves optional dashboard/TUI/Telegram richness and tracker write-back out of scope

## Goals
- Persist authoritative retry-state data in CO including `attempt`, `error`, and an internal retry deadline (`due_at_ms` or equivalent), then project the external retry deadline field on the compatibility API surface.
- Expose authoritative retry rows in `/api/v1/state.retrying`.
- Expose truthful `/api/v1/<issue>.retry` and `/api/v1/<issue>.attempts` payloads for the bounded slice.
- Keep the post-worker-exit scheduler ownership/cadence rewrite explicitly out of scope for this slice; queued retry metadata is the authoritative seam, not a promise of broader lifecycle parity.
- Keep the slice bounded away from running-row telemetry and optional operator-surface richness already addressed or tracked elsewhere.

## Non-Goals
- Reopening the `1313` running-row plus aggregate telemetry lane.
- Treating the full post-worker-exit scheduler ownership/cadence parity question as solved by this slice.
- Bundling optional dashboard/TUI/Telegram richness into this slice.
- Treating orchestrator-managed Linear write-back as a parity requirement.

## Metrics & Guardrails
- Primary Success Metrics:
  - `/api/v1/state.retrying[*]` exposes authoritative retry metadata instead of inferred-or-null payloads
  - `/api/v1/<issue>.retry` exposes real retry state when CO tracks it
  - `/api/v1/<issue>.attempts.restart_count` and `current_retry_attempt` stop defaulting to null when authoritative retry state exists
  - the retry ledger/runtime source is explicit and auditable rather than presenter-only derivation
- Guardrails / Error Budgets:
  - do not invent retry counts, due times, or errors that CO still does not track
  - keep scheduler ownership/cadence parity explicit and out of scope unless implementation evidence proves coupling
  - keep optional UI/operator-surface richness out unless backend/API work strictly requires a companion update

## User Experience
- Personas:
  - CO operator validating retry-state parity progress against Symphony
  - follow-on implementer carrying retry-state work without reopening already-landed running-row telemetry scope
- User Journeys:
  - the operator can see `1314` as a completed bounded backend/API parity slice after `1313`
  - `/api/v1/state.retrying` and `/api/v1/<issue>` expose retry metadata that is sourced from a real CO retry ledger instead of inferred manifest status
  - the operator can also see that the remaining blocker after `1314` is the separate scheduler/timer ownership model, not missing retry payload fields

## Technical Considerations
- Architectural Notes:
  - `1313` addresses proof-backed running rows plus aggregate telemetry, but it intentionally does not create a retry ledger
  - `1314` now sources authoritative retry fields from provider-intake/handoff state and threads them through `selectedRunProjection`, `controlRuntime`, `observabilityReadModel`, `compatibilityIssuePresenter`, and `observabilitySurface`
  - the implementation preserves truthful retry attempts for genuine retry-driven relaunches while clearing retry metadata for normal post-success continuation
  - post-worker-exit scheduler cadence remains a separate parity concern even after the narrower retry ledger has landed
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`

## Open Questions
- Should the follow-on parity lane replace CO's persisted wall-clock `retry_due_at` plus refresh ownership with a Symphony-style retry queue that owns timer handles and monotonic due times directly?
- Is any additional reconciliation state needed beyond the current provider-intake retry ledger once the scheduler/timer lane is reopened?

## Approvals
- Product: Self-approved for the next bounded retry-state parity slice after `1313`.
- Engineering: Self-approved on 2026-03-22 against the current upstream SPEC, Elixir retry-state behavior, and the refreshed integrated branch publication posture.
- Design: N/A
