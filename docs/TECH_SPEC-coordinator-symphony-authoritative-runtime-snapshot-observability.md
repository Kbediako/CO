---
id: 20260321-1313-coordinator-symphony-authoritative-runtime-snapshot-observability
title: Coordinator Symphony Authoritative Runtime Snapshot and Observability
relates_to: docs/PRD-coordinator-symphony-authoritative-runtime-snapshot-observability.md
risk: high
owners:
  - Codex
last_review: 2026-03-22
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: land the bounded backend-authoritative runtime snapshot parity slice after `1312` by replacing prior runtime snapshot/API null placeholders with proof-backed provider-worker/runtime telemetry.
- Scope: `/api/v1/state`, `/api/v1/<issue>`, compatibility runtime payloads, and the worker/runtime capture they require.
- Constraints:
  - parity authority is `/Users/kbediako/Code/symphony/SPEC.md` plus the current Elixir `orchestrator.ex`
  - `1313` is backend/API authority only; optional dashboard/TUI/Telegram richness stays out of scope
  - orchestrator-managed Linear write-back is not a parity requirement for this slice
  - if strict post-worker-exit retry cadence still proves parity-critical, keep it explicit rather than silently burying it in `1313`

## Current Branch State
- Upstream snapshot contract:
  - `/Users/kbediako/Code/symphony/SPEC.md:1296-1309` defines the runtime snapshot contract for running rows, retry rows, aggregate `codex_totals`, and latest `rate_limits`
  - `/Users/kbediako/Code/symphony/SPEC.md:1403-1503` defines the suggested `/api/v1/state` and `/api/v1/<issue>` payload shapes
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:1098-1148,1172-1529` materializes that contract from authoritative in-memory runtime state and Codex updates
- Current CO implementation on this branch:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts` now writes widened worker proof carrying session, turn, token, and rate-limit runtime data for the bounded slice
  - `orchestrator/src/cli/control/selectedRunProjection.ts` and `controlRuntime.ts` now assemble proof-backed running rows plus aggregate `codex_totals` and latest `rate_limits`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`, `compatibilityIssuePresenter.ts`, and `observabilitySurface.ts` now expose those authoritative runtime fields instead of hardcoded null placeholders
- Remaining divergence after `1313`:
  - authoritative retry queue ownership remained a separate slice and was tracked by `1314`
  - optional dashboard/TUI/Telegram richness and tracker write-back remain out of scope
  - current branch publication posture on `2026-03-22`: `1312`, `1313`, and `1314` are one integrated implemented publication unit; use `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md` as the current-head closeout summary, and do not cite older `20260321T124445Z-stacked-closeout` or `20260321T124510Z-stack-closeout` packs as current-head validation

## Technical Requirements
- Functional requirements:
  - authoritative running rows must expose `session_id`, `turn_count`, `last_event`, `last_message`, `started_at`, `last_event_at`, and token totals when CO has the underlying runtime data
  - authoritative retry rows must expose real retry attempt/due/error metadata when CO tracks it
  - `/api/v1/state` must expose aggregate `codex_totals` and latest `rate_limits` instead of hardcoded `null`
  - `/api/v1/<issue>` must expose truthful `attempts`, `running`, and `retry` payloads instead of inferred-or-null placeholders
  - the data source must be backend-authoritative runtime capture, not presenter-only field filling
- Non-functional requirements:
  - do not invent values that CO still does not track
  - keep `1312` selected-only proof compatibility intact while widening the runtime capture for `1313`
  - keep the diff bounded away from optional human-readable surface richness unless the backend/API change strictly requires a companion test update

## Architecture & Data
- Architecture / design adjustments:
  - the current branch widens provider-worker runtime capture beyond narrow lineage proof so it carries token totals, latest rate limits, and enough metadata to support authoritative running rows
  - the current branch loads that runtime capture through `selectedRunProjection` and `controlRuntime`, then assembles authoritative compatibility payloads in `observabilityReadModel`, `compatibilityIssuePresenter`, and `observabilitySurface`
  - retry ownership/cadence remained outside this slice and moved to the explicit `1314` follow-on packet rather than being guessed inside presenters
- Data model changes / migrations:
  - the current provider worker proof/runtime sidecar now extends beyond `thread_id` / `turn_count` / owner status into a broader runtime snapshot shape
  - the observability read model now carries structured `codex_totals` and `rate_limits` payload types
  - selected-run proof compatibility remains preserved while compatibility/runtime projection reads the widened runtime snapshot
- External dependencies / integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`

## Validation Plan
- Tests / checks:
  - docs-review for the registered `1313` packet before implementation
  - focused worker-capture tests for the widened runtime snapshot/proof shape
  - focused control-runtime and observability API regressions proving non-null authoritative fields where runtime data exists
  - standard implementation lane checks before closeout: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, targeted tests, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, review, and `npm run pack:smoke` if downstream-facing surfaces are touched
- Rollout verification:
  - live control-host proof shows `/api/v1/state` and `/api/v1/<issue>` exposing authoritative runtime fields for an active provider-managed issue
  - selected-run proof remains truthful and compatible after the widened runtime capture lands
- Monitoring / alerts:
  - inspect runtime snapshot payloads for any remaining hardcoded `null` fields that should now be authoritative
  - inspect retry payloads for guessed attempt metadata

## Open Questions
- Keep strict post-worker-exit retry-cadence parity separate unless the implementation proves the fields cannot become authoritative without it.
- Keep optional dashboard/TUI/Telegram richness out of this packet unless backend/API validation proves a coupling.

## Approvals
- Reviewer: docs-review prechecks passed in `.runs/1313-coordinator-symphony-authoritative-runtime-snapshot-observability/cli/2026-03-21T10-51-39-272Z-84d7b8f1/manifest.json`; bounded review override recorded in `out/1313-coordinator-symphony-authoritative-runtime-snapshot-observability/manual/20260321T110919Z-docs-first/05-docs-review-override.md`.
- Date: 2026-03-22
