---
id: 20260321-1314-coordinator-symphony-authoritative-retry-state-and-attempts
title: Coordinator Symphony Authoritative Retry State and Attempts
relates_to: docs/PRD-coordinator-symphony-authoritative-retry-state-and-attempts.md
risk: high
owners:
  - Codex
last_review: 2026-03-21
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: deliver and record the next backend-authoritative parity slice after `1313` by replacing the old inferred-or-null retry queue model with real retry state and issue-level attempts data.
- Scope: authoritative retry state in CO plus `/api/v1/state.retrying`, `/api/v1/<issue>.retry`, and `/api/v1/<issue>.attempts`.
- Constraints:
  - parity authority is `/Users/kbediako/Code/symphony/SPEC.md` plus the current Elixir `orchestrator.ex`
  - `1314` is retry-state/API authority only; strict post-worker-exit scheduler ownership/cadence parity stays out of scope
  - queued retry metadata is the authoritative seam for this slice; `1314` does not rewrite the broader provider-intake claim lifecycle or refresh cadence
  - optional dashboard/TUI/Telegram richness stays out of scope
  - orchestrator-managed Linear write-back is not a parity requirement for this slice

## Current Branch State
- Upstream retry-state contract:
  - `/Users/kbediako/Code/symphony/SPEC.md:1403-1454` defines retry rows and issue-level retry/attempt payloads, while `/Users/kbediako/Code/symphony/SPEC.md:743-747` defines the internal retry entry with `attempt`, `error`, and `due_at_ms`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:775-812,1130-1152` materializes authoritative retry queue state from explicit runtime retry state and exposes a projected retry deadline (`due_in_ms` there) on the state snapshot
- Implemented CO behavior for `1314`:
  - `orchestrator/src/cli/control/providerIntakeState.ts` persists authoritative `retry_queued`, `retry_attempt`, `retry_due_at`, and `retry_error` fields
  - `orchestrator/src/cli/control/providerIssueHandoff.ts` maintains queued retry metadata, deadline math, continuation delay, and exponential failure backoff for the bounded slice
  - `orchestrator/src/cli/control/selectedRunProjection.ts` and `orchestrator/src/cli/control/controlRuntime.ts` build retry rows from provider-intake claims instead of failed-manifest inference
  - `orchestrator/src/cli/control/observabilityReadModel.ts` and `orchestrator/src/cli/control/compatibilityIssuePresenter.ts` expose authoritative `attempt`, `due_at`, `error`, `restart_count`, and `current_retry_attempt` payloads
  - normal post-success continuation clears retry metadata, while genuine retry-driven relaunches preserve truthful retry attempts
- Residual divergence after `1314`:
  - Symphony still owns retries with an in-memory timer queue, timer cancellation, and monotonic `due_at_ms`
  - CO still uses persisted wall-clock `retry_due_at` plus the control-host refresh / best-effort rehydrate loop to decide when to relaunch
  - the `1314` closeout pack is now historical evidence for the earlier `1312`/`1313`/`1314` implemented-on-branch tranche; current branch truth for PR `#283` is that `1315` and `1316` are also landed on branch, but publication remains open and the `1316` closeout root is the current validation vehicle

## Technical Requirements
Functional requirements:
  - CO must persist authoritative retry metadata including `attempt`, `error`, and an internal retry deadline (`due_at_ms` or equivalent) when a provider-managed issue is queued for retry
  - `/api/v1/state.retrying` must be sourced from that retry metadata instead of failed-manifest inference
  - `/api/v1/<issue>.retry` must expose the same authoritative retry state, including an external retry deadline field projected from the stored deadline
  - `/api/v1/<issue>.attempts.restart_count` and `current_retry_attempt` must derive from the authoritative retry record when it exists
  - the retry state source must be backend-authoritative, not presenter-only derivation
- Non-functional requirements:
  - do not guess retry metadata that CO still does not track
  - keep scheduler ownership/cadence parity explicit and separate
  - keep the diff bounded away from optional human-readable surface richness unless backend/API work strictly requires a companion test update

## Architecture & Data
- Architecture / design adjustments:
  - extend provider-intake/handoff state, or an adjacent retry ledger, with authoritative retry metadata
  - thread that retry metadata through `selectedRunProjection` and `controlRuntime`, then assemble authoritative retry payloads in `observabilityReadModel`, `compatibilityIssuePresenter`, and `observabilitySurface`
  - remove retry row inference from failed manifests once the retry ledger is authoritative
Data model changes / migrations:
  - extend the current provider-intake claim or adjacent runtime record with retry `attempt`, `error`, and an internal retry deadline (`due_at_ms` or equivalent)
  - widen `ControlRetryPayload` to carry the missing authoritative retry fields
  - preserve `1313` running-row and aggregate telemetry compatibility while adding the retry ledger
- External dependencies / integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`

## Validation Plan
- Tests / checks:
  - docs-review for the registered `1314` packet before implementation
  - focused provider-intake/handoff/runtime/API regressions proving authoritative retry fields
  - standard implementation lane checks before closeout: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, targeted tests, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, review, and `npm run pack:smoke` if downstream-facing surfaces are touched
- Rollout verification:
  - live control-host proof shows `/api/v1/state.retrying` and `/api/v1/<issue>` exposing authoritative retry metadata for a provider-managed issue that is actually queued for retry
  - `1313` running-row plus aggregate telemetry proof remains truthful after the retry ledger lands
- Monitoring / alerts:
  - inspect retry rows for any remaining `attempt`, projected deadline, or `error` placeholders that should now be authoritative
  - inspect issue-level `attempts` for null-derived values after retry metadata is present

## Open Questions
- Keep strict post-worker-exit scheduler ownership/cadence parity separate unless implementation evidence proves a hard coupling.
- Keep optional dashboard/TUI/Telegram richness and tracker write-back out of this packet unless backend/API validation proves otherwise.

## Approvals
- Reviewer: `docs-review` succeeded for `1314` at `.runs/1314-coordinator-symphony-authoritative-retry-state-and-attempts/cli/2026-03-21T11-38-19-443Z-469bf7c8/manifest.json`.
- Date: 2026-03-21
