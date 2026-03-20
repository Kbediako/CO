---
id: 20260320-1311-coordinator-symphony-full-parity-hardening-and-closure
title: Coordinator Symphony Full-Parity Hardening and Closure
status: in_progress
owner: Codex
created: 2026-03-20
last_review: 2026-03-20
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-full-parity-hardening-and-closure.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-full-parity-hardening-and-closure.md
related_tasks:
  - tasks/tasks-1311-coordinator-symphony-full-parity-hardening-and-closure.md
review_notes:
  - 2026-03-20: Opened as the delivery follow-up to `1310`. The parity authority is `/Users/kbediako/Code/symphony/SPEC.md` at commit `a164593aacb3db4d6808adc5a87173d906726406`, with current Elixir reference behavior used to scope richer operational parity surfaces.
---

# Technical Specification

## Context

`1310` closed the truthful rebaseline plus bounded fixes. `1311` is the new lane that must close the remaining real parity blockers rather than documenting them again.

## Requirements

1. Implement deterministic per-issue workspace identity and execution confinement for provider-started child runs.
2. Replace best-effort provider lifecycle inference with authoritative claim/running/retry/completed/released bookkeeping.
3. Add running-issue reconcile plus stop/release semantics when provider state changes.
4. Add true continuation behavior while the issue remains active without depending on a fresh provider event.
5. Raise issue eligibility toward the upstream scheduler model enough for truthful parity.
6. Upgrade compatibility/observability/UI surfaces to present authoritative issue/workspace/turn/lifecycle state.
7. Keep tracker-write ownership aligned with the SPEC's scheduler/reader boundary instead of widening it into a false blocker.

## Current Truth

- Core blockers are workspace confinement and authoritative lifecycle reconcile.
- Current CO provider intake remains narrower than the upstream scheduler contract.
- Tracker writes are aligned at the core-contract level and do not block `1311`.
- `1311` must not claim closure until workspace plus lifecycle proof is live.
- The current branch lands workspace confinement, refresh-driven continuation, release/reconcile behavior, and truthful observability/read-model hardening, but it does not yet close the whole task.
- Live `turn_count`, `codex_totals`, `rate_limits`, and related retry counters are not derivable from current authoritative CO sources, so `1311` cannot truthfully close full parity until that capture exists or is explicitly deferred.

## Validation Plan

- docs-review before implementation
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- focused lifecycle/workspace tests
- full repo gate chain
- live provider proof against the existing control host
