---
id: 20260410-linear-255030bf-bdda-4594-b503-28639a98b9da
title: CO: shift Linear intake to webhook-first targeted reconcile with slow full recovery sweeps
relates_to: docs/PRD-linear-255030bf-bdda-4594-b503-28639a98b9da.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-255030bf-bdda-4594-b503-28639a98b9da.md`
- PRD: `docs/PRD-linear-255030bf-bdda-4594-b503-28639a98b9da.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-255030bf-bdda-4594-b503-28639a98b9da.md`
- Task checklist: `tasks/tasks-linear-255030bf-bdda-4594-b503-28639a98b9da.md`

## Traceability
- Linear issue: `CO-144` / `255030bf-bdda-4594-b503-28639a98b9da`
- Linear URL: https://linear.app/asabeko/issue/CO-144/co-shift-linear-intake-to-webhook-first-targeted-reconcile-with-slow

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: reduce steady-state Linear request burn by making webhook-by-id intake the primary fast path and by replacing ordinary full active-set polling with targeted reconcile plus bounded fresh discovery.
- Scope:
  - register the docs-first packet for `linear-255030bf-bdda-4594-b503-28639a98b9da`
  - preserve startup full recovery and slower missed-event recovery sweeps
  - split ordinary refresh behavior into per-claim reconcile and free-slot-bounded fresh discovery
  - add a lean discovery payload and defer richer reads until by-id reconcile or launch time
  - preserve operator-visible budget truth and record before or after request-burn evidence
- Constraints:
  - keep webhook-only migration out of scope
  - do not remove full sweeps entirely
  - preserve release, retry, reattach, and relaunch behavior
  - keep shared-budget fail-closed posture intact

## Technical Requirements
- Functional requirements:
  - webhook create or update intake must remain a direct by-id fast path
  - ordinary scheduled ticks must no longer preload the full active tracked-issue set by default
  - existing claims must reconcile correctly through direct by-id reads
  - fresh discovery must only run when free dispatch capacity exists
  - discovery must stop once enough eligible candidates exist for the current free-slot demand
  - startup and slower periodic recovery sweeps must still recover missed events and unchanged older ready work
  - lean discovery queries must fetch only the fields needed for eligibility and ordering
  - operator surfaces must keep truthful cooldown, next-refresh, and reason data
- Non-functional requirements:
  - preserve current dispatch ordering and slot-budget semantics
  - reduce avoidable request burn rather than hiding pressure through looser cooldown truth
  - keep the implementation bounded to the intake and recovery seam rather than widening into provider workflow redesign
- Interfaces / contracts:
  - `linearWebhookController.ts` accepted issue-delivery path
  - `controlServerPublicLifecycle.ts` scheduled refresh coordinator
  - `providerIssueHandoff.ts` reconcile and poll cycle
  - `linearDispatchSource.ts` tracked-issue discovery query contract
  - `providerPollingHealth.ts` next-refresh and budget truth

## Architecture & Data
- Architecture / design adjustments:
  - ordinary refresh should reconcile owned claims via `resolveTrackedIssue(...)` instead of preloading the full tracked set
  - fresh discovery should call `resolveLiveLinearTrackedIssues(...)` in a bounded mode that stops after enough eligible candidates are found
  - slower full recovery sweeps should remain explicit and separate from ordinary targeted ticks
  - lean discovery reads should avoid full per-issue history payloads unless a candidate is selected or reconciled by id
- Data model changes / migrations:
  - no major persisted schema change is required up front if sweep cadence can be derived from existing lifecycle state; add persisted sweep metadata only if the scheduler needs durable cadence truth
  - request-burn comparison artifacts should land under the task-scoped `out/` or `.runs/` paths rather than as ad hoc shell notes
- External dependencies / integrations:
  - existing shared-budget headers and cooldown state
  - current Linear issue query and by-id query helpers
  - provider polling-health state

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - targeted coverage for `LinearDispatchSource`, `ProviderIssueHandoff`, and `ControlServerPublicLifecycle`
  - required repo validation floor after implementation
- Rollout verification:
  - compare before and after request-burn evidence from shared-budget or header-backed telemetry
  - verify startup recovery, missed-event recovery, release or reattach, retry refetch, and relaunch-after-success
  - verify bounded discovery stop conditions and truthful next-refresh state
- Monitoring / alerts:
  - use workpad validation notes plus persisted budget or polling-health artifacts as the reviewer-visible evidence path

## Open Questions
- Fixed-cadence versus webhook-staleness-aware slow-sweep triggering can stay implementation-scoped as long as the first landed policy is explicit and test-backed.

## Approvals
- Reviewer: codex-orchestrator docs-review (failed-other, manual fallback accepted)
- Status: docs-review rerun passed spec-guard and docs:check; repo-wide docs:freshness stale baseline remains unrelated to the CO-144 packet
- Date: 2026-04-10
