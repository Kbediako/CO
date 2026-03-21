# ACTION_PLAN - Coordinator Symphony Authoritative Retry State and Attempts

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: register, deliver, and truthfully record the next backend-authoritative parity slice after `1313`, replacing inferred-or-null retry rows and issue attempts with real retry state.
- Scope: retry ledger/runtime capture plus `/api/v1/state.retrying`, `/api/v1/<issue>.retry`, and `/api/v1/<issue>.attempts`.
- Assumptions:
  - `1313` covers proof-backed running rows plus aggregate telemetry
  - the bounded retry-state/API gap is now implemented in the current branch
  - strict scheduler ownership/cadence parity stays separate from this slice
  - queued retry metadata is the authoritative seam for `1314`; the broader provider-intake claim lifecycle and refresh cadence stay as-is

## Status Update - 2026-03-22
- Completed on the current branch: `1314` is implemented as part of the integrated `1312`/`1313`/`1314` publication unit.
- Current-head closeout summary for that integrated unit is `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`; do not cite older `20260321T124445Z-stacked-closeout` or `20260321T124510Z-stack-closeout` packs as current-head validation.
- Still explicitly separate: `1315` remains the next retry-owner slice, and its docs-review succeeded without implying that `1315` implementation is already landed.

## Milestones & Sequencing
1. Register the bounded `1314` packet
   - draft PRD, TECH_SPEC, ACTION_PLAN, task checklist, and mirror
   - update `tasks/index.json` and `docs/TASKS.md`
2. Introduce authoritative retry state
   - extend provider-intake/handoff state or add an adjacent retry ledger
   - capture enough structured retry data to support authoritative `attempt`, `error`, and an internal retry deadline that the API can project as its external retry deadline field
3. Thread authority through runtime/read-model assembly
   - load the retry ledger into `selectedRunProjection` and `controlRuntime`
   - stop hardcoding retry attempts to `null`
4. Surface authoritative retry API payloads
   - update `/api/v1/state.retrying`, `/api/v1/<issue>.retry`, and `/api/v1/<issue>.attempts`
   - keep scheduler-cadence parity separate unless implementation proves coupling
5. Validate, record, and prove
   - run focused provider-intake/handoff/runtime/API regressions
   - refresh the docs packet so it records the implemented slice and the remaining scheduler/timer gap truthfully
   - run the standard full validation lane
   - collect live control-host proof for retry rows and issue-level retry payloads

## Dependencies
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/observabilitySurface.ts`

## Validation
- docs-review for the `1314` packet before implementation
- focused provider-intake/handoff/runtime/API regressions proving authoritative retry fields
- standard implementation lane commands once code lands
- current-head closeout pack for the integrated implemented `1312`/`1313`/`1314` unit: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`; review/elegance reruns plus live control-host proof still remain pending there
- live control-host proof for `/api/v1/state.retrying` and `/api/v1/<issue>`

## Risks & Mitigations
- Risk: retry metadata gets guessed inside presenters instead of coming from a ledger.
  - Mitigation: require provider-intake/handoff or adjacent runtime state changes first.
- Risk: this silently turns into the larger scheduler-cadence parity slice.
  - Mitigation: keep post-worker-exit scheduler ownership/cadence explicit and out of scope.
- Risk: optional operator-surface richness bloats the diff.
  - Mitigation: keep `1314` backend/API-only unless tests prove a hard coupling.

## Approvals
- Reviewer: Self-approved for a bounded backend retry-state parity slice after `1313`.
- Date: 2026-03-22
