---
id: 20260417-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c
title: Control host prevent repeated refresh-stuck restart churn while active provider workers remain healthy
status: in_progress
relates_to: docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md
risk: high
owners:
  - Codex
last_review: 2026-06-17
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-05-18: CO-522 active-spec audit found 1 unchecked task checklist item, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
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
- Shared source-0 note: this payload carries run metadata and prompt-pack provenance only; it is not the issue body.
- Apr 18 source-0 note: the recurrence refresh payload also carries run metadata and prompt-pack provenance only; it is not the issue body.
- Apr 21 Rework note: Linear reopened `CO-211` after live recurrence showed `status=restart_required`, `last_health_status=probe_timeout`, `restart_count=1374`, stale owner reclamation, and active `CO-225`, `CO-276`, and `CO-289` workers still heartbeating.
- Read-only issue-body source: `node /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js linear issue-context --issue-id 59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c --format json`
- Docs packet child lane: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-packet/cli/2026-04-17T02-07-55-950Z-cb83673c/manifest.json`
- Apr 18 docs refresh child lane: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr18-refresh/cli/2026-04-18T18-35-19-649Z-1ede381a/manifest.json`
- Apr 21 Rework docs child lane: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr21-rework/cli/2026-04-21T10-55-06-746Z-91d3806a/manifest.json` (zero-byte advisory; parent owns this refresh)
- Merged PR #506 commit: `e98d459f4dfdb47a22d981fedbf5ba11053d3a95` (`fix(control-host): quarantine repeated refresh-stuck restart churn`)

## Summary
- Objective: stop repeated refresh-stuck restart churn from re-entering while active provider workers remain healthy, make the churn sequence durable enough to audit without operator memory, and refresh the packet for Apr 21 Rework evidence after prior PR #506 / #544 fixes did not cover the `probe_timeout` recurrence path.
- Scope:
  - docs-first packet and registry/checklist mirrors for `CO-211`
  - machine-checkable restart/churn evidence with `owner rotations`, `refresh phases`, and `surviving provider workers`
  - phase/request/claim diagnostics around `stalled_after_ms=45000`
  - worker-preserving, no-request-burn recovery
  - post-recovery verification through `co-status --format json`
  - parent-owned recurrence source fix for `probe_timeout` restart records preserving fail-closed truth, diagnostic retention, and active-worker safety
- Constraints:
  - keep `CO-210` child-lane manifest hydration semantics out of scope
  - preserve adjacent safeguards from `CO-194`, `CO-163`, `CO-179`, `CO-119`, and `CO-41`
  - Apr 21 zero-byte docs child lane is advisory evidence only; parent owns this docs refresh and implementation

## Issue-Shaping Contract
- User-request translation carried forward: repeated `provider_refresh_lifecycle_stuck` / `restart_required` recovery while active `CO-207` and `CO-210` provider workers remain healthy is a distinct control-host/provider lifecycle problem. PR #506 and PR #544 landed the initial quarantine and diagnostic-retention fixes, but Apr 21 recurrence evidence shows supervision can still churn through `probe_timeout` restarts while active workers remain healthy. The remaining fix must preserve fail-closed first-sample truth, retain a diagnostic snapshot from local provider-intake state when `co-status` times out, and quarantine only repeated timeout churn for the same active worker series.
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
- Nearby wrong interpretations to reject:
  - the lane is only an attach reconnect or endpoint rotation issue from `CO-179`
  - the lane is only a CO STATUS projection or `CO-210` manifest hydration issue
  - the lane can succeed by suppressing `provider_refresh_lifecycle_stuck` without exposing or resolving the underlying lifecycle stall
  - the lane can recover by killing or restarting healthy active provider workers
  - the lane can reintroduce direct issue-by-id burn after `restart_required=true`
- Explicit non-goals carried forward:
  - no `CO-210` child-lane manifest hydration semantics changes
  - no attach-only endpoint rotation fix as the answer
  - no hidden lifecycle-stall truth
  - no worker kill/restart recovery path for healthy active workers
  - no new direct issue-by-id burn in the same stuck pass
  - no broad scheduler or status redesign

## Parity / Alignment Matrix
- Current truth:
  - repeated `provider_refresh_lifecycle_stuck` / `restart_required` recovery can coexist with healthy active provider workers
  - local artifacts show successful recovery, but restart series, `owner rotations`, `refresh phases`, and `surviving provider workers` are not durable enough to reconstruct cleanly later
  - the 45s watchdog boundary exists, but diagnostics do not yet name the precise phase/request/claim context that crossed `stalled_after_ms=45000`
  - read-only status can recover and show `polling.stuck=false` / `polling.restart_required=false`, but the restart churn itself is not yet owned end to end
  - Apr 21 live state can still reach supervision `restart_required` with `last_health_status=probe_timeout` and no durable diagnostic snapshot even while active workers keep heartbeating
- Reference truth:
  - healthy active workers should not trigger repeated supervisor restart churn
  - quarantined samples must not erase fail-closed unhealthy streaks or diagnostic retention
  - restart-series evidence should be artifact-backed and machine-checkable
  - fail-closed truth for genuine stuck refreshes must stay visible
  - request-budget/no-request-burn safeguards after `restart_required=true` remain authoritative
- Target truth / intended delta:
  - parent can reproduce or simulate the Apr 17 churn shape
  - one durable artifact records restart series, `owner rotations`, `refresh phases`, `surviving provider workers`, current provider keys, and operation age
  - diagnostics identify the phase/request/claim class that exceeded `stalled_after_ms=45000`
  - the re-entry condition is fixed or quarantined so healthy active workers do not cause repeated restart churn
  - quarantined samples preserve fail-closed unhealthy streaks and diagnostic retention after PR #506
  - repeated `probe_timeout` churn for the same active worker series preserves the first fail-closed restart record and then quarantines repeated churn using retained local provider-intake diagnostics
  - `co-status --format json` verifies post-recovery truth with `polling.stuck=false`, `polling.restart_required=false`, and live provider workers visible
- Explicitly out-of-scope differences:
  - `CO-210` manifest hydration semantics
  - attach-only endpoint rotation recovery
  - suppression of `provider_refresh_lifecycle_stuck` without root-cause handling
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
  - 2026-04-17: docs child lane read the current issue body through the packaged read-only `linear issue-context` helper and confirmed the issue is broader than attach-only or status-only recovery. The issue explicitly requires restart-series evidence, `owner rotations`, `refresh phases`, `surviving provider workers`, `stalled_after_ms=45000` diagnostics, worker-preserving recovery, request-budget/no-request-burn safety, and post-recovery `co-status --format json` truth while keeping `CO-210` manifest hydration semantics out of scope. The micro-task path is ineligible because correctness depends on exact protected terms, exact surfaces, and a cross-issue boundary with `CO-194`, `CO-163`, `CO-179`, `CO-119`, and `CO-41`.
  - 2026-04-18: docs refresh child lane confirmed the supplied source-0 payload is metadata/provenance only and refreshed the packet from the parent prompt plus local git evidence that PR #506 merged as `e98d459f4dfdb47a22d981fedbf5ba11053d3a95`. The Apr 18 recurrence keeps the issue open for parent-owned source work on quarantined samples preserving fail-closed unhealthy streaks and diagnostic retention.
  - 2026-04-21: parent Rework lane confirmed prior PRs `#506` and `#544` are merged, deleted the stale workpad, reset from `origin/main`, and launched `docs-apr21-rework` as a same-issue child lane. That child lane completed successfully with a zero-byte advisory patch, so parent owns this Apr 21 refresh and the source fix for `last_health_status=probe_timeout` recurrence under active workers.
- Safeguard ownership split:
  - child lane owns only the packet files and listed registry/checklist mirrors
  - parent lane owns source/test inspection, implementation, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and patch integration

## Technical Requirements
- Functional requirements:
  1. Create the docs-first packet and registry/checklist mirrors for `CO-211`.
  2. Reproduce or simulate the Apr 17 shape where active `CO-207` / `CO-210`-like provider workers remain running while control-host polling repeatedly enters `provider_refresh_lifecycle_stuck` / `restart_required`.
  3. Persist machine-checkable restart/churn evidence that captures restart series, `owner rotations`, `refresh phases`, and `surviving provider workers`.
  4. Add diagnostics that identify which refresh phase, request, or claim class exceeded `stalled_after_ms=45000`.
  5. Include operation age, queued/checking state, and current provider keys at the stuck boundary.
  6. Fix or quarantine the root re-entry condition so healthy active provider workers do not cause repeated supervisor restarts within normal polling cadence.
  7. Keep quarantined samples diagnostic-retentive: no clearing fail-closed unhealthy streaks and no loss of diagnostic retention.
  8. Keep timeout samples diagnostic-retentive: when `co-status` times out, preserve local persisted provider-intake polling and running-worker context in restart history instead of recording a null diagnostic.
  9. Quarantine repeated `probe_timeout` restart churn only when the same active worker series already triggered a fail-closed timeout restart inside the bounded quarantine window.
  10. Preserve fail-closed truth: genuine stuck refreshes still set `provider_refresh_lifecycle_stuck` and `restart_required=true`, and first/unrelated `probe_timeout` samples still fail closed.
  11. Preserve worker safety: supervised recovery must not kill active `provider-linear-worker` issue processes.
  12. Preserve request-budget/no-request-burn behavior from `CO-163` / `CO-179` after `restart_required=true`; do not add new direct issue-by-id burn in the same stuck pass.
  13. Verify `co-status --format json` succeeds after recovery and reports `polling.stuck=false`, `polling.restart_required=false`, and live running provider workers.
  14. Keep a focused no-regression path for `CO-194` stale terminal claims.
- Non-functional requirements:
  - restart-series evidence must be machine-checkable and durable under `.runs/` or `out/`
  - diagnostics must be additive and safe to log
  - diagnostic retention survives quarantine behavior
  - recovery must remain bounded; no tight restart loop
  - no worker kill/restart side effect for healthy active provider workers
  - no request-budget or issue-by-id burn regression after `restart_required=true`
- Interfaces / contracts:
  - `providerIssueHandoff`
  - provider polling health / `provider_refresh_lifecycle_stuck`
  - public lifecycle / `restart_required`
  - runtime and supervision restart logic
  - `co-status --format json`
  - provider-worker preservation surfaces for `CO-207` / `CO-210`

## Architecture & Data
- Architecture / design adjustments:
  - add a narrow, durable restart/churn artifact rather than relying on operator memory or transient terminal logs
  - keep churn ownership on the lifecycle/recovery seam, not on `CO-210` manifest hydration or attach-only UX
  - keep post-PR #506 recurrence ownership on the parent source fix, not on this docs child lane
  - use one authoritative diagnostic shape for phase/request/claim metadata at `stalled_after_ms=45000`
  - keep `co-status --format json` as post-recovery verification, not the sole source of churn evidence
  - use local persisted `provider-intake-state.json` as fallback diagnostic input only when the HTTP `co-status` probe times out; do not add Linear reads or issue-by-id burn in the timeout pass
- Required artifact content:
  - restart series or recovery sequence identifier
  - `owner rotations`
  - `refresh phases`
  - request or claim class
  - operation age
  - queued/checking state
  - current provider keys
  - `surviving provider workers`
  - stuck classification at `stalled_after_ms=45000`
  - timeout classification when the supervising `co-status` probe itself cannot return JSON
  - post-recovery `polling.stuck` / `polling.restart_required` result
- Data model changes / migrations:
  - prefer additive fields in existing JSON artifacts or a new bounded artifact under the issue task path
  - parent-owned quarantine state may add or retain diagnostic fields only if fail-closed unhealthy streaks remain auditable
  - no schema changes to `CO-210` child-lane hydration semantics
- External dependencies / integrations:
  - no Linear mutation from this child lane
  - parent-owned focused regression coverage and docs-review

## Validation Plan
- Child-lane checks:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `git diff --check -- docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/tasks-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md .agent/task/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent-lane checks:
  - focused regression coverage for repeated restart churn
  - focused recurrence coverage proving quarantined samples preserve fail-closed unhealthy streaks and diagnostic retention
  - focused no-regression coverage for `CO-194` stale terminal claims
  - manifest-backed docs-review before implementation
  - parent-selected implementation validation after source edits
  - post-recovery `co-status --format json` proof with `polling.stuck=false` and `polling.restart_required=false`
- Rollout verification:
  - parent records exact artifact paths for restart-series evidence and focused regressions in the workpad/checklist
  - parent records the final post-recovery status artifact once the fix lands

## Open Questions
- Which lifecycle seam should own the restart-series artifact so supervision, provider polling, and status all read the same truth?
- Which request or claim classes are most likely to survive restart while healthy active workers remain alive?
- Is the smallest safe parent-owned source fix a re-entry guard, a stale retained-state quarantine, or richer lifecycle classification at the stuck boundary?
- How should quarantined samples expose preserved fail-closed unhealthy streaks and diagnostic retention without triggering another active-worker restart loop?

## Approvals
- Reviewer: docs child lane self-review for packet shape and issue-shaping contract.
- Date: 2026-04-18
