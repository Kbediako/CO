---
id: 20260417-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c
title: Control host prevent repeated refresh-stuck restart churn while active provider workers remain healthy
relates_to: docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md
risk: high
owners:
  - Codex
last_review: 2026-04-17
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
- Shared source-0 note: this payload carries run metadata and prompt-pack provenance only; it is not the issue body.
- Read-only issue-body source: `node /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js linear issue-context --issue-id 59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c --format json`
- Docs packet child lane: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-packet/cli/2026-04-17T02-07-55-950Z-cb83673c/manifest.json`

## Summary
- Objective: stop repeated refresh-stuck restart churn from re-entering while active provider workers remain healthy, and make the churn sequence durable enough to audit without operator memory.
- Scope:
  - docs-first packet and registry/checklist mirrors for `CO-211`
  - machine-checkable restart/churn evidence with `owner rotations`, `refresh phases`, and `surviving provider workers`
  - phase/request/claim diagnostics around `stalled_after_ms=45000`
  - worker-preserving, no-request-burn recovery
  - post-recovery verification through `co-status --format json`
- Constraints:
  - keep `CO-210` child-lane manifest hydration semantics out of scope
  - preserve adjacent safeguards from `CO-194`, `CO-163`, `CO-179`, `CO-119`, and `CO-41`
  - child lane remains docs-only; parent owns implementation, tests, docs-review, validation, Linear/workpad reconciliation, PR, and merge

## Issue-Shaping Contract
- User-request translation carried forward: repeated `provider_refresh_lifecycle_stuck` / `restart_required` recovery while active `CO-207` and `CO-210` provider workers remain healthy is a distinct control-host/provider lifecycle problem that needs its own machine-checkable evidence, diagnostics, and bounded fix.
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
- Reference truth:
  - healthy active workers should not trigger repeated supervisor restart churn
  - restart-series evidence should be artifact-backed and machine-checkable
  - fail-closed truth for genuine stuck refreshes must stay visible
  - request-budget/no-request-burn safeguards after `restart_required=true` remain authoritative
- Target truth / intended delta:
  - parent can reproduce or simulate the Apr 17 churn shape
  - one durable artifact records restart series, `owner rotations`, `refresh phases`, `surviving provider workers`, current provider keys, and operation age
  - diagnostics identify the phase/request/claim class that exceeded `stalled_after_ms=45000`
  - the re-entry condition is fixed or quarantined so healthy active workers do not cause repeated restart churn
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
  - active provider workers are killed or restarted as part of recovery
  - `CO-210` child-lane manifest hydration semantics are changed
- Pre-implementation issue-quality review evidence:
  - 2026-04-17: docs child lane read the current issue body through the packaged read-only `linear issue-context` helper and confirmed the issue is broader than attach-only or status-only recovery. The issue explicitly requires restart-series evidence, `owner rotations`, `refresh phases`, `surviving provider workers`, `stalled_after_ms=45000` diagnostics, worker-preserving recovery, request-budget/no-request-burn safety, and post-recovery `co-status --format json` truth while keeping `CO-210` manifest hydration semantics out of scope. The micro-task path is ineligible because correctness depends on exact protected terms, exact surfaces, and a cross-issue boundary with `CO-194`, `CO-163`, `CO-179`, `CO-119`, and `CO-41`.
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
  7. Preserve fail-closed truth: genuine stuck refreshes still set `provider_refresh_lifecycle_stuck` and `restart_required=true`.
  8. Preserve worker safety: supervised recovery must not kill active `provider-linear-worker` issue processes.
  9. Preserve request-budget/no-request-burn behavior from `CO-163` / `CO-179` after `restart_required=true`; do not add new direct issue-by-id burn in the same stuck pass.
  10. Verify `co-status --format json` succeeds after recovery and reports `polling.stuck=false`, `polling.restart_required=false`, and live running provider workers.
  11. Keep a focused no-regression path for `CO-194` stale terminal claims.
- Non-functional requirements:
  - restart-series evidence must be machine-checkable and durable under `.runs/` or `out/`
  - diagnostics must be additive and safe to log
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
  - use one authoritative diagnostic shape for phase/request/claim metadata at `stalled_after_ms=45000`
  - keep `co-status --format json` as post-recovery verification, not the sole source of churn evidence
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
  - post-recovery `polling.stuck` / `polling.restart_required` result
- Data model changes / migrations:
  - prefer additive fields in existing JSON artifacts or a new bounded artifact under the issue task path
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
- Is the smallest safe fix a re-entry guard, a stale retained-state quarantine, or richer lifecycle classification at the stuck boundary?

## Approvals
- Reviewer: docs child lane self-review for packet shape and issue-shaping contract.
- Date: 2026-04-17
