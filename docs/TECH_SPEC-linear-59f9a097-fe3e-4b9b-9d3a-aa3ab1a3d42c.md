---
id: 20260417-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c
title: CO-211 repeated refresh-stuck restart churn with healthy active workers
relates_to: docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md
risk: high
owners:
  - Codex
last_review: 2026-04-21
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- PRD: `docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- Task checklist: `tasks/tasks-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`

## Traceability
- Linear issue: `CO-211` / `59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c`
- Linear URL: https://linear.app/asabeko/issue/CO-211/control-host-prevent-repeated-refresh-stuck-restart-churn-while-active
- Source anchor: `ctx:sha256:d4239a4784c1cf71c95ab480b4a3821dc2c83dc3648d3b8d4a8c5387ccdfb3f8#chunk:c000001`
- Shared source-0 metadata anchor: `ctx:sha256:737c3cf3d517b1a44673a4ef90593a10f7303f6e022a667e75cceca113e8acb8#chunk:c000001`
- Apr 18 recurrence source anchor: `ctx:sha256:6a9427aa000f73b2f7d86bab415ae29c6ebbeb9172e159c03bc6d29ae012ff52#chunk:c000001`
- Apr 21 Rework source anchor: `ctx:sha256:159ce815aa248f1705d76a533af179440608299883a742a504b31e83b029a294#chunk:c000001`
- Docs packet child lane manifest: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-packet/cli/2026-04-17T02-07-55-950Z-cb83673c/manifest.json`
- Apr 18 docs refresh child lane manifest: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr18-refresh/cli/2026-04-18T18-35-19-649Z-1ede381a/manifest.json`
- Apr 21 Rework docs child lane manifest: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr21-rework/cli/2026-04-21T10-55-06-746Z-91d3806a/manifest.json` (zero-byte advisory; parent owns this refresh)
- Merged PR #506 commit: `e98d459f4dfdb47a22d981fedbf5ba11053d3a95` (`fix(control-host): quarantine repeated refresh-stuck restart churn`)

## Summary
- Objective: treat repeated refresh-stuck restart churn with healthy active workers as its own lifecycle bug, add durable observability, preserve worker-safety plus no-request-burn behavior, and refresh the packet for Apr 21 Rework evidence after prior PR #506 / #544 fixes did not cover the `probe_timeout` recurrence path.
- Scope:
  - docs-first packet and registry/checklist mirrors
  - machine-checkable restart/churn evidence
  - `stalled_after_ms=45000` diagnostics for phase/request/claim context
  - bounded recovery that preserves active provider workers
  - post-recovery verification through `co-status --format json`
  - parent-owned recurrence source fix for `probe_timeout` restart records preserving fail-closed truth, diagnostic retention, and active-worker safety
- Constraints:
  - do not change `CO-210` child-lane manifest hydration semantics
  - do not collapse the issue into attach-only recovery from `CO-179`
  - do not regress `CO-194`, `CO-163`, `CO-179`, `CO-119`, or `CO-41`
  - Apr 21 zero-byte docs child lane is advisory evidence only; parent owns this docs refresh and implementation

## Issue-Shaping Contract
- User-request translation carried forward: Apr 17 churn is not healthy steady-state behavior even when supervisor recovery succeeds; PR #506 and PR #544 landed the initial quarantine and diagnostic-retention fixes, but Apr 21 recurrence evidence shows supervision can still churn through `probe_timeout` restarts while active workers remain healthy. The remaining fix must preserve fail-closed first-sample truth, retain a diagnostic snapshot from local provider-intake state when `co-status` times out, and quarantine only repeated timeout churn for the same active worker series.
- Protected terms / exact artifact and surface names:
  - `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `stalled_after_ms=45000`
  - `owner rotations`
  - `refresh phases`
  - `surviving provider workers`
  - `co-status --format json`
  - `polling.stuck=false`
  - `polling.restart_required=false`
  - `CO-207`
  - `CO-210`
  - `CO-194`
  - `CO-163`
  - `CO-179`
  - `CO-119`
  - `CO-41`
- Nearby wrong interpretations to reject: attach-only fix, status-only fix, hidden stuck truth, worker-killing recovery, or `CO-210` scope expansion.
- Explicit non-goals carried forward: no `CO-210` hydration change, no attach-only endpoint rotation fix, no hidden lifecycle-stall truth, no worker-killing recovery, no new issue-by-id burn, and no broad scheduler/status redesign.

## Parity / Alignment Matrix
- Current truth:
  - repeated `provider_refresh_lifecycle_stuck` / `restart_required` recovery can happen while active provider workers remain healthy
  - local artifacts prove recovery, but restart-series evidence is not yet durable enough to replay cleanly
  - current diagnostics stop at the 45s watchdog boundary without enough phase/request/claim detail
  - post-recovery status can be healthy, but the churn itself is not yet owned end to end
- Reference truth:
  - healthy active workers should not keep re-triggering restart churn
  - quarantined samples must not erase fail-closed unhealthy streaks or diagnostic retention
  - restart-series evidence should be machine-checkable and artifact-backed
  - genuine stuck refreshes must still surface `provider_refresh_lifecycle_stuck` and `restart_required=true`
  - request-budget/no-request-burn safeguards after `restart_required=true` remain authoritative
- Target truth / intended delta:
  - one issue-scoped artifact records restart series, `owner rotations`, `refresh phases`, `surviving provider workers`, current provider keys, and stuck-phase metadata
  - diagnostics identify which phase/request/claim exceeded `stalled_after_ms=45000`
  - the re-entry condition is fixed or quarantined so healthy active workers do not cause repeated restart churn
  - quarantined samples preserve fail-closed unhealthy streaks and diagnostic retention after PR #506
  - `co-status --format json` verifies post-recovery truth with `polling.stuck=false`, `polling.restart_required=false`, and live running provider workers
- Explicitly out-of-scope differences:
  - `CO-210` child-lane manifest hydration semantics
  - attach-only reconnect behavior
  - suppression of stuck truth without root-cause handling
  - worker-sacrificing recovery
  - request-budget policy weakening

## Readiness Gate
- Not done if:
  - supervisor still reaches `restart_required` every few minutes under active healthy workers
  - the fix only makes `co-status attach` reconnect after endpoint rotation
  - the fix suppresses `provider_refresh_lifecycle_stuck` without exposing or resolving the underlying lifecycle stall
  - quarantined samples clear fail-closed unhealthy streaks or drop diagnostic retention
  - active provider workers are killed or restarted as part of recovery
  - `CO-210` child-lane manifest hydration semantics are changed
- Pre-implementation issue-quality review evidence:
  - 2026-04-17: docs child lane reviewed the current issue body through the packaged read-only `linear issue-context` helper and approved the wider churn/observability framing. The issue is not plausibly narrower than the user's request because it explicitly requires restart-series evidence, `owner rotations`, `refresh phases`, `surviving provider workers`, `stalled_after_ms=45000` diagnostics, worker-preserving recovery, request-budget/no-request-burn safety, and post-recovery `co-status --format json` truth while keeping `CO-210` out of scope. The micro-task path is ineligible.
  - 2026-04-18: docs refresh child lane confirmed the supplied source-0 payload is metadata/provenance only and refreshed the packet from the parent prompt plus local git evidence that PR #506 merged as `e98d459f4dfdb47a22d981fedbf5ba11053d3a95`. The Apr 18 recurrence keeps the issue open for parent-owned source work on quarantined samples preserving fail-closed unhealthy streaks and diagnostic retention.
  - 2026-04-21: parent Rework lane confirmed prior PRs `#506` and `#544` are merged, deleted the stale workpad, reset from `origin/main`, and launched `docs-apr21-rework` as a same-issue child lane. That child lane completed successfully with a zero-byte advisory patch, so parent owns this Apr 21 refresh and the source fix for `last_health_status=probe_timeout` recurrence under active workers.
- Safeguard ownership split:
  - child lane owns packet files plus listed registry/checklist mirrors
  - parent lane owns source/test inspection, implementation, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and patch integration

## Technical Requirements
- Functional requirements:
  - persist machine-checkable restart/churn evidence so future agents can reconstruct restart series, `owner rotations`, `refresh phases`, and `surviving provider workers`
  - diagnose which refresh phase, request, or claim class exceeds `stalled_after_ms=45000`
  - include operation age, queued/checking state, and current provider keys in the stuck evidence
  - fix or quarantine the root re-entry condition so healthy active provider workers do not cause repeated restart churn
  - keep quarantined samples diagnostic-retentive: no clearing fail-closed unhealthy streaks and no loss of diagnostic retention
  - keep timeout samples diagnostic-retentive: when `co-status` times out, preserve local persisted provider-intake polling and running-worker context in restart history instead of recording a null diagnostic
  - quarantine repeated `probe_timeout` restart churn only when the same active worker series already triggered a fail-closed timeout restart inside the bounded quarantine window
  - preserve fail-closed truth for genuine stuck refreshes
  - preserve fail-closed truth for first or unrelated `probe_timeout` samples
  - preserve active `provider-linear-worker` issue processes during recovery
  - preserve `CO-163` / `CO-179` no-request-burn behavior after `restart_required=true`
  - verify post-recovery health through `co-status --format json`
  - preserve a focused no-regression path for `CO-194`
- Non-functional requirements:
  - additive observability only; no hidden behavior
  - diagnostic retention survives quarantine behavior
  - bounded restart/recovery behavior; no tight loops
  - safe to log and review; no sensitive spill
  - no `CO-210` semantics drift
- Interfaces / contracts:
  - parent-inspection seams named in the workpad: `providerIssueHandoff`, polling health, public lifecycle, runtime, supervision
  - provider worker lifecycle and preservation surfaces
  - status verification via `co-status --format json`

## Architecture & Data
- Architecture / design adjustments:
  - keep churn ownership at the lifecycle/recovery seam rather than status hydration
  - keep post-PR #506 recurrence ownership on the parent source fix, not on this docs child lane
  - record one authoritative restart/churn artifact instead of scattering evidence across transient logs
  - keep `co-status --format json` as verification rather than the only observability surface
  - use local persisted `provider-intake-state.json` as fallback diagnostic input only when the HTTP `co-status` probe times out; do not add Linear reads or issue-by-id burn in the timeout pass
- Required artifact fields:
  - restart series or recovery sequence id
  - timestamps or sequence order for `owner rotations`
  - `refresh phases`
  - request or claim class
  - operation age
  - queued/checking state
  - current provider keys
  - `surviving provider workers`
  - stuck classification at `stalled_after_ms=45000`
  - timeout classification when the supervising `co-status` probe itself cannot return JSON
  - post-recovery `polling.stuck` and `polling.restart_required` values
- Data model changes / migrations:
  - additive fields in existing JSON artifacts or one new bounded artifact under the issue task path are acceptable
  - parent-owned quarantine state may add or retain diagnostic fields only if fail-closed unhealthy streaks remain auditable
  - no schema change to `CO-210` hydration semantics
- External dependencies / integrations:
  - no Linear mutation from this child lane
  - parent-owned focused tests and docs-review

## Validation Plan
- Child-lane checks:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `git diff --check -- docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/tasks-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md .agent/task/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent-lane checks:
  - focused repeated-churn regression coverage
  - focused recurrence coverage proving quarantined samples preserve fail-closed unhealthy streaks and diagnostic retention
  - focused `probe_timeout` recurrence coverage proving restart history retains fallback diagnostics and repeated same-series timeout churn is quarantined
  - focused no-regression coverage for `CO-194`
  - manifest-backed docs-review before implementation
  - parent-selected implementation validation after source edits
  - post-recovery `co-status --format json` proof with `polling.stuck=false` and `polling.restart_required=false`

## Open Questions
- Which lifecycle seam should own the restart-series artifact so provider polling, supervision, and status agree?
- What is the smallest safe parent-owned source fix if healthy active workers and repeated restart churn only intersect through one retained refresh-state re-entry path?
- How should quarantined samples expose preserved fail-closed unhealthy streaks and diagnostic retention without triggering another active-worker restart loop?
- How narrow should the timeout quarantine signature be: active worker series only, or active worker series plus retained polling reason from persisted provider-intake state?
- Should the stuck-boundary artifact attach request/claim classification inline or summarize it after recovery?

## Approvals
- Reviewer: docs child lane self-review for packet shape and issue-shaping contract.
- Date: 2026-04-18
