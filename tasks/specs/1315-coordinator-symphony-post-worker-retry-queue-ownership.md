---
id: 20260321-1315-coordinator-symphony-post-worker-retry-queue-ownership
title: Coordinator Symphony Post-Worker Retry Queue Ownership
status: in_progress
owner: Codex
created: 2026-03-21
last_review: 2026-03-22
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-post-worker-retry-queue-ownership.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-post-worker-retry-queue-ownership.md
related_tasks:
  - tasks/tasks-1315-coordinator-symphony-post-worker-retry-queue-ownership.md
review_notes:
  - 2026-03-21: Opened as the next registered parity slice after `1314` so retry ownership is tracked explicitly instead of being buried as a caveat.
  - 2026-03-21: Upstream authority for this slice remains `/Users/kbediako/Code/symphony/SPEC.md:608-626`, `/Users/kbediako/Code/symphony/SPEC.md:743-794`, and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:128-145,775-812,1130-1139`.
  - 2026-03-21: The current branch still owns retry dispatch through persisted wall-clock `retry_due_at` plus refresh / rehydrate cadence.
  - 2026-03-21: `1314` remains the bounded retry-payload truth slice; `1315` is the follow-on retry-owner slice.
  - 2026-03-21: docs-review for `1315` succeeded at `.runs/1315-coordinator-symphony-post-worker-retry-queue-ownership/cli/2026-03-21T13-04-33-775Z-038089ca/manifest.json`.
  - 2026-03-21: `1315` is necessary but not sufficient for full hardened parity; post-`1315` real gaps still remain around poll-owned discovery/recovery, `POST /api/v1/refresh` ack shape, running/issue state semantics, and retry workspace fallback unless provider-driven discovery is later accepted as an intentional divergence.
  - 2026-03-22: docs-review for `1315` succeeded via `.runs/1315-coordinator-symphony-post-worker-retry-queue-ownership/cli/2026-03-21T13-04-33-775Z-038089ca/manifest.json`.
  - 2026-03-22: Current branch truth now includes the landed `1315` implementation through `providerIssueRetryQueue.ts`, `providerIssueHandoff.ts`, and the coupled runtime-truth updates. A refreshed current-head closeout pack for the integrated `1312`-`1315` branch packet is still pending.
---

# Technical Specification

## Context

`1314` already closed the bounded retry payload truth gap. The remaining divergence is retry ownership: Symphony owns post-worker continuation/failure retries through an in-memory queue with timer cancellation and monotonic due times, while CO still waits for refresh / rehydrate to notice persisted wall-clock deadlines.

## Requirements

1. Register `1315` as the next bounded retry-owner parity slice after `1314`.
2. Move post-worker continuation/failure retry timing under a dedicated runtime retry-queue owner.
3. Make refresh / rehydrate observer-bootstrap only for retry timing, not a second active retry owner.
4. Cancel and replace any existing pending retry for the same issue when a newer retry supersedes it, and cancel pending timers when the issue goes non-active, the claim is released, manual stop/cancel wins, retry dispatch succeeds, or startup rebuild replaces stale timers.
5. Track retry deadlines in monotonic/runtime-owned form while preserving restart/bootstrap truth as needed.
6. Preserve truthful retry metadata plus `workspace_path` where CO tracks it, without inventing `worker_host` fields that the current provider flow does not carry.
7. Keep `/api/v1/state.retrying`, `/api/v1/<issue>.retry`, and `/api/v1/<issue>.attempts` truthful during and after the ownership change.
8. Keep `1312` same-session in-worker continuation separate from this slice.
9. Keep broader active-run reconciliation, optional dashboard/TUI/Telegram richness, tracker write-back, and the post-`1315` follow-on gaps out of scope unless implementation proves a hard coupling.

## Current Truth

- Upstream retry-owner authority is explicit in `/Users/kbediako/Code/symphony/SPEC.md:608-626` and `/Users/kbediako/Code/symphony/SPEC.md:743-794`.
- The current Elixir implementation schedules continuation retry on normal completion and owns retries through in-memory timer state in `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:128-145,775-812,1130-1139`.
- Current CO now owns retry launch timing through:
  - `orchestrator/src/cli/control/providerIssueRetryQueue.ts` in-memory retry scheduling with cancel/replace semantics
  - `orchestrator/src/cli/control/providerIssueHandoff.ts` queued retry dispatch plus restart-safe rebuild
- Current CO truth that must be preserved:
  - `1312` same-session continuation inside a live worker session
  - `1314` authoritative retry payload truth on `/api/v1/state.retrying` and `/api/v1/<issue>`
- Even after `1315`, full parity still requires a follow-on lane for poll-owned discovery/recovery and observability API normalization unless provider-driven discovery is later accepted as an intentional divergence.

## Validation Plan

- docs-review before implementation
- focused retry-owner regressions for prompt continuation retry, cancel/requeue behavior, explicit timer-cancel paths, no double-dispatch near the due boundary, truthful retry payloads, and restart-safe rebuild
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- targeted tests for the chosen retry-owner seam
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- review
- `npm run pack:smoke` if downstream-facing surfaces are touched
- live control-host proof for scheduler-owned continuation retry plus truthful retry API payloads
