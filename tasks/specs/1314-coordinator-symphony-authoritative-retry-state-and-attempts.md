---
id: 20260321-1314-coordinator-symphony-authoritative-retry-state-and-attempts
title: Coordinator Symphony Authoritative Retry State and Attempts
status: in_progress
owner: Codex
created: 2026-03-21
last_review: 2026-03-22
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-authoritative-retry-state-and-attempts.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-authoritative-retry-state-and-attempts.md
related_tasks:
  - tasks/tasks-1314-coordinator-symphony-authoritative-retry-state-and-attempts.md
review_notes:
  - 2026-03-21: Opened as the next registered parity slice after `1313` so the retry queue blocker is tracked by a real docs-first packet instead of being left implicit.
  - 2026-03-21: Upstream authority for this slice remains `/Users/kbediako/Code/symphony/SPEC.md:1403-1454` plus `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:775-812,1130-1152`.
  - 2026-03-21: The current branch now persists authoritative retry fields, projects retry rows from provider-intake state, and derives issue attempts from the retry ledger.
  - 2026-03-21: Strict post-worker-exit scheduler ownership/cadence parity remains outside this slice.
  - 2026-03-22: Current branch truth is that `1312`, `1313`, and `1314` are one integrated implemented publication unit. Use `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md` as the current-head closeout summary; older `20260321T124445Z-stacked-closeout` and `20260321T124510Z-stack-closeout` packs are stale for current-head validation.
---

# Technical Specification

## Context

`1313` addresses running-row plus aggregate telemetry authority, and `1314` now closes the bounded backend-authoritative retry queue payload gap. The remaining broader divergence is the scheduler/timer ownership model, not missing retry payload fields.

## Requirements

1. Register `1314` as the next backend-authoritative retry-state slice after `1313`.
2. Add authoritative retry metadata including `attempt`, `error`, and an internal retry deadline (`due_at_ms` or equivalent) where CO tracks it, then project the external retry deadline field on the API surface.
3. Expose authoritative retry rows in `/api/v1/state.retrying`.
4. Expose truthful `retry` and `attempts` payloads in `/api/v1/<issue>`.
5. Source the data from provider-intake/handoff or an adjacent retry ledger, not presenter-only inference.
6. Keep optional dashboard/TUI/Telegram richness out of scope unless backend/API work strictly requires a companion update.
7. Keep strict post-worker-exit scheduler ownership/cadence parity separate from this slice.
8. Treat queued retry metadata as the authoritative seam while leaving the broader provider-intake claim lifecycle and refresh cadence unchanged.

## Current Truth

- Upstream retry-state authority is explicit in `/Users/kbediako/Code/symphony/SPEC.md:1403-1454`.
- The current Elixir implementation materializes authoritative retry queue state from explicit runtime state in `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:775-812,1130-1152`.
- Current CO now implements the bounded slice:
  - `orchestrator/src/cli/control/providerIntakeState.ts` persists authoritative retry fields
  - `orchestrator/src/cli/control/providerIssueHandoff.ts` maintains retry deadline math and retry-driven relaunch state for the bounded slice
  - `orchestrator/src/cli/control/selectedRunProjection.ts`, `controlRuntime.ts`, `observabilityReadModel.ts`, and `compatibilityIssuePresenter.ts` expose authoritative retry rows and issue attempts
- Remaining divergence after `1314`:
  - Symphony owns retries with an in-memory timer queue and monotonic due times
  - CO still uses persisted `retry_due_at` plus refresh-loop ownership to trigger relaunch

## Validation Plan

- docs-review before implementation
- focused provider-intake/handoff/runtime/API regressions for authoritative retry fields
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- targeted tests for the chosen retry-state seam
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- review
- `npm run pack:smoke` if downstream-facing surfaces are touched
- live control-host proof for `/api/v1/state.retrying` and `/api/v1/<issue>`
