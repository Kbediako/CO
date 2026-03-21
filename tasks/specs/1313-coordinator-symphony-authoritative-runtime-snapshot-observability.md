---
id: 20260321-1313-coordinator-symphony-authoritative-runtime-snapshot-observability
title: Coordinator Symphony Authoritative Runtime Snapshot and Observability
status: in_progress
owner: Codex
created: 2026-03-21
last_review: 2026-03-21
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-authoritative-runtime-snapshot-observability.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-authoritative-runtime-snapshot-observability.md
related_tasks:
  - tasks/tasks-1313-coordinator-symphony-authoritative-runtime-snapshot-observability.md
review_notes:
  - 2026-03-21: Opened as the next registered parity slice after `1312` so the runtime-snapshot blocker is tracked by a real docs-first packet instead of only being named in `1312` mirrors.
  - 2026-03-21: Upstream authority for this slice remains `/Users/kbediako/Code/symphony/SPEC.md:1296-1309,1403-1503` plus `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:1098-1148,1172-1529`.
  - 2026-03-21: The current branch now lands proof-backed running rows plus aggregate `codex_totals` and latest `rate_limits` through the compatibility/API surfaces.
  - 2026-03-21: Authoritative retry queue ownership stayed separate from `1313` and remained the explicit follow-on slice in `1314`.
  - 2026-03-21: Orchestrator-managed Linear write-back remains outside the parity requirement for this slice.
  - 2026-03-21: The `1314` closeout pack is now historical evidence for the earlier `1312`/`1313`/`1314` implemented-on-branch tranche; current branch truth for PR `#283` is that `1315` and `1316` are also landed on branch, but publication remains open and the `1316` closeout root is the current validation vehicle.
---

# Technical Specification

## Context

`1312` lands the in-worker same-session continuation seam, and `1313` now closes the bounded backend-authoritative runtime snapshot contract on the current branch. The remaining divergence after this slice was the authoritative retry queue model, which stayed separate and is tracked by `1314`.

## Requirements

1. Register `1313` as the next backend-authoritative runtime snapshot slice after `1312`.
2. Replace compatibility/API null placeholders for running and retry runtime fields with authoritative runtime data where CO captures it.
3. Expose aggregate `codex_totals` and latest `rate_limits` in `/api/v1/state`.
4. Expose truthful `attempts`, `running`, and `retry` payloads in `/api/v1/<issue>`.
5. Source the data from worker/runtime capture and control-runtime assembly, not presenter-only inference.
6. Keep optional dashboard/TUI/Telegram richness out of scope unless backend/API work strictly requires a companion update.
7. Keep tracker write-back out of scope for this parity slice.

## Current Truth

- Upstream runtime snapshot authority is explicit in `/Users/kbediako/Code/symphony/SPEC.md:1296-1309,1403-1503`.
- The current Elixir implementation materializes authoritative running/retrying rows, aggregate totals, and latest rate limits in `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:1098-1148,1172-1529`.
- Current CO now implements the bounded slice:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts` writes widened worker proof with session/turn/token/rate-limit runtime data
  - `orchestrator/src/cli/control/selectedRunProjection.ts` and `controlRuntime.ts` assemble proof-backed running rows plus aggregate `codex_totals` and latest `rate_limits`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`, `compatibilityIssuePresenter.ts`, and `observabilitySurface.ts` expose those authoritative runtime fields through `/api/v1/state` and `/api/v1/<issue>`
- Remaining divergence after `1313`:
  - authoritative retry queue ownership remained separate and was tracked by `1314`
  - optional dashboard/TUI/Telegram richness and tracker write-back stay out of scope for this slice

## Validation Plan

- docs-review before implementation
- focused worker/runtime/API regressions for authoritative runtime fields
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- targeted tests for the chosen runtime snapshot seam
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- review
- `npm run pack:smoke` if downstream-facing surfaces are touched
- live control-host proof for `/api/v1/state` and `/api/v1/<issue>`
