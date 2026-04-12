# PRD - CO workflow: hard-gate all Linear consumers on shared request headroom

## Traceability
- Linear issue: `CO-156` / `e934e6ea-8fdd-480c-9656-22c020cb19cf`
- Linear URL: https://linear.app/asabeko/issue/CO-156/co-workflow-hard-gate-all-linear-consumers-on-shared-request-headroom
- Related landed slices: `CO-62`, `CO-110`, `CO-144`, `CO-147`

## Summary
- Problem Statement: CO already has shared Linear budget persistence, request-aware polling slowdown, helper fail-fast, webhook-first targeted reconcile, and live request-burn evidence. The remaining defect is that one global request-headroom reserve is not enforced across every Linear consumer. A caller with a few requests left can still spend shared headroom on restart, rehydrate, recovery sweep, fresh discovery, issue-by-id refresh, or helper bookkeeping because the current governor only blocks on cooldown, exhaustion, or explicit per-operation minimums. CO also lacks a shared machine-readable burn history that attributes request deltas over time by caller and run/process metadata.
- Desired Outcome: make one shared request-headroom reserve the hard gate for all nonessential Linear consumers, keep safe cached/local fallbacks where they already exist, and persist shared request-burn telemetry so operators can attribute budget burn over time without guessing from isolated snapshots.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-156` by closing the remaining reserve-blind request paths after `CO-144`. Do not reopen the webhook-first design or remove Linear. Instead, enforce one shared low-headroom policy across helpers, tracked-issue reads, restart/rehydrate/reconcile flows, and related provider/control-host bookkeeping, while preserving active work and adding enough shared telemetry to explain where request budget is going.
- Success criteria / acceptance:
  - a single shared budget governor blocks nonessential live Linear requests during cooldown, zero budget, or low shared request headroom
  - helper operations such as `upsert-workpad`, `attach-pr`, `transition`, and `create-follow-up` fail before any live request when the shared reserve would be violated
  - tracked-issue query modes such as `recovery_sweep`, `fresh_discovery`, and issue-by-id refresh fail closed before `fetch` when headroom is below reserve
  - restart and rehydrate keep local progress truth but stop spending reserve-blind live reads
  - shared request-burn telemetry records source, operation, run/process metadata, request id, remaining delta, reset time, and cooldown reason over time
- Constraints / non-goals:
  - preserve current CO capabilities and Linear integration
  - preserve `CO-144` webhook-first targeted reconcile behavior
  - treat raw request count as the scarce dimension; complexity headroom alone is not safety
  - do not weaken workpad, PR attachment, review handoff, or merge closeout requirements

## Intent Checksum
- Exact user wording / phrases to preserve:
  - "hard-gate all Linear consumers on shared request headroom"
  - "shared request headroom"
  - "raw request count"
  - "restart/rehydrate/reconcile"
  - "request-burn telemetry"
- Protected terms / exact artifact and surface names:
  - `CO-144`
  - `CO-147`
  - `issue-context`
  - `upsert-workpad`
  - `attach-pr`
  - `transition`
  - `create-follow-up`
  - `dispatch_source_tracked_issues`
  - `dispatch_source_tracked_issues:recovery_sweep`
  - `dispatch_source_tracked_issues:fresh_discovery`
  - `dispatch_source_issue_by_id`
  - `providerIssueHandoff`
  - `linearBudgetState.ts`
- Nearby wrong interpretations to reject:
  - only lower the active issue cap
  - only reduce `CO STATUS` attach frequency
  - reopen or replace the `CO-144` webhook-first targeted reconcile design
  - solve stale-ghost ownership root cause in this lane
  - hide exhaustion with silent retries instead of fail-closed local behavior

## Parity / Alignment Matrix
- Not applicable. This is a bounded shared-budget governance and telemetry lane, not a parity or alignment migration.
- Current truth:
  - `linearBudgetState.ts` persists shared budget observations, cooldown state, endpoint aliases, and reservation-aware materialization
  - `providerLinearWorkflowFacade.ts` already performs local validation and many fail-fast checks before live helper mutations
  - `linearDispatchSource.ts` already uses the shared governor, but current preflight only blocks on cooldown, exhaustion, or explicit minimums
  - `controlServerPublicLifecycle.ts` already widens polling under pressure, but reserve-blind reads can still happen before the last shared headroom is protected
  - `CO-147` captured live request-burn evidence, but shared over-time attribution is not yet persisted as a reusable telemetry stream
- Reference truth:
  - nonessential shared-token consumers should not spend the last protected request headroom
  - restart, rehydrate, recovery sweep, and fresh discovery should defer live requests until the reserve is healthy again
  - operators should be able to explain request burn from shared persisted evidence rather than one-off reproduction notes
- Target truth / intended delta:
  - the shared governor enforces reserve-aware fail-fast before any live Linear request across helper, dispatch, and rehydrate/reconcile paths
  - safe cached/local fallbacks continue where they already exist
  - shared request-burn telemetry is persisted with enough metadata for local diagnostics and status consumers
- Explicitly out-of-scope differences:
  - replacing Linear as a provider
  - redesigning webhook-first intake
  - stale-ghost root-cause remediation beyond preventing extra burn amplification

## Not Done If
- With synthetic `requests.remaining=0` or active cooldown, any poll, refresh, workpad, attach-pr, transition, follow-up, status/UI, child-stream bookkeeping, or rehydrate path still makes a live Linear request without an explicit essential override.
- Repeated invalid follow-up creation attempts can still hit Linear before local validation fails.
- Restart or rehydrate can still trigger immediate bulk discovery or recovery while below the configured request reserve.
- CO cannot attribute request burn over time by source, run_id, process, operation, request id, remaining delta, reset time, and cooldown reason.
- Fixes rely only on lowering issue concurrency instead of making every Linear consumer reserve-aware.

## Goals
- Add one reserve-aware shared-budget gate for nonessential Linear consumers across provider/control-host paths.
- Reuse existing helper validation and cache/local fallback behavior rather than widening into a new mutation model.
- Protect restart, rehydrate, recovery sweep, fresh discovery, and issue-by-id refresh from spending shared reserve-blind requests.
- Persist request-burn telemetry that can be inspected by local diagnostics and surfaced through existing shared-budget consumers.

## Non-Goals
- Removing or weakening Linear helper requirements.
- Reworking the broader control-host architecture.
- Solving `CO-96` ownership cleanup beyond preventing extra request burn.
- Treating complexity headroom as a substitute for request headroom.

## Stakeholders
- Product: CO operator / provider-worker owner
- Engineering: control-host lifecycle, Linear workflow facade, dispatch source, and observability maintainers
- Design: N/A

## Technical Considerations
- Architectural Notes:
  - the likely narrow owner is `orchestrator/src/cli/control/linearBudgetState.ts`, because most helper and dispatch paths already delegate preflight to that module
  - the likely call sites affected are `providerLinearWorkflowFacade.ts`, `linearDispatchSource.ts`, `providerIssueHandoff.ts`, and `controlServerPublicLifecycle.ts`
  - request-burn telemetry should stay shared and machine-checkable instead of becoming worker-local narrative
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/linearBudgetState.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`

## Open Questions
- Whether the shared telemetry should live inline in the persisted budget snapshot or as a bounded sibling history surface. Default to the smallest truthful option that preserves local diagnostics and status continuity.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: pending docs-review child stream and implementation validation
- Design: N/A
