---
id: 20260320-1311-coordinator-symphony-full-parity-hardening-and-closure
title: Coordinator Symphony Full-Parity Hardening and Closure
status: in_progress
owner: Codex
created: 2026-03-20
last_review: 2026-03-21
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-full-parity-hardening-and-closure.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-full-parity-hardening-and-closure.md
related_tasks:
  - tasks/tasks-1311-coordinator-symphony-full-parity-hardening-and-closure.md
review_notes:
  - 2026-03-20: Opened as the delivery follow-up to `1310`. The parity authority is `/Users/kbediako/Code/symphony/SPEC.md` at commit `a164593aacb3db4d6808adc5a87173d906726406`, with current Elixir reference behavior used to scope richer operational parity surfaces.
  - 2026-03-21: March 21 review-fix tranche landed for queued manual refreshes during in-flight provider handoff work, truthful selected-run workspace fallback under overridden runs roots, real repo-root provider workspace cleanup when `CODEX_ORCHESTRATOR_RUNS_DIR` is external, and released-claim cancel retry when provider refresh resolves to `skip` without reopening overlapping refresh/cancel cycles. The same day also landed the manifest-persister force-preempt fix, moved the refresh-serialization regression into a dedicated focused test file to eliminate full-suite flake, hardened released-claim cancel retry collapse so queued skipped refreshes share one pending follow-up retry signal per manifest, capped skip-path retries at that single follow-up, added resume deferral while a released-run cancel remains in flight, and restored local full `npm run test` to terminal green at `283/283` files and `2019/2019` tests in `199.49s`; the focused release-cancel retry regression pack now passes `4/4` files and `61/61` tests, and a trivial `CodexOrchestrator.start()` repro still drops from about `5.1s` to about `112ms`.
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

- The current branch already lands deterministic workspace recreation plus prune, legacy resume deterministic workspace fallback, resume workspace-root confinement validation, startup immediate refresh, queued/null release fail-closed behavior, released-claim stability on rehydrate, active-issue eligibility for `Todo` plus Linear `state_type=started` issues with a Todo blocker rule that prefers Linear blocker `state.type` and falls back to blocker state names, terminal-only cleanup for provider-managed `.workspaces/<taskId>` on release/startup replay, selected child-manifest UI metadata truthfulness, and compatibility `session_id=null` handling.
- The current branch now also lands queued follow-up refresh for explicit authenticated/manual refresh requests that arrive during in-flight provider handoff work, truthful selected-run workspace fallback for child CLI manifests under repo-local and external overridden runs roots, and real repo-root provider workspace cleanup when `CODEX_ORCHESTRATOR_RUNS_DIR` is outside the repository.
- The current branch now also lands same-tick manifest-persister force-preempt behavior so forced writes do not inherit the heartbeat interval from a queued non-forced persist.
- The current branch now also lands released-claim cancel retry during skipped provider refresh so already-released queued or in-progress child runs still receive cancel follow-ups when provider issue resolution is temporarily unavailable, while queued skipped refreshes dedupe the in-flight cancel and can issue one follow-up retry after a failed attempt without blocking refresh completion.
- Provider control-host continuation/retry handoff for active issues is materially covered, but full parity is still not closed.
- Tracker writes are aligned at the core-contract level and do not block `1311`.
- `1311` must not claim closure while real blockers remain, even though the full local suite is terminal green.
- Live `turn_count`, `codex_totals`, `rate_limits`, and related retry counters are not derivable from current authoritative CO sources, so `1311` cannot truthfully close full parity until that capture exists or is explicitly deferred.
- Active-issue continuation after a normal success still starts a fresh child run rather than continuing the same live session.

## Validation Plan

- docs-review before implementation
- `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused release-cancel retry regression pack (`4/4` files and `61/61` tests)
- persister fast-path regression pack (`2/2` files and `16/16` tests)
- full repo gate chain, with the explicit current truth that local `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test` is terminal again at `283/283` files and `2019/2019` tests in `199.49s`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs` with the explicit March 21 override
- `npm run pack:smoke`
- live provider proof against the existing control host
