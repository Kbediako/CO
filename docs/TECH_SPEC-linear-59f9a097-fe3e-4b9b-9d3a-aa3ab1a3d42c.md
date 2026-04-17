---
id: 20260417-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c
title: CO-211 repeated refresh-stuck restart churn with healthy active workers
relates_to: docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md
risk: high
owners:
  - Codex
last_review: 2026-04-17
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
- Docs packet child lane manifest: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-packet/cli/2026-04-17T02-07-55-950Z-cb83673c/manifest.json`

## Summary
- Objective: treat repeated refresh-stuck restart churn with healthy active workers as its own lifecycle bug, add durable observability, and preserve worker-safety plus no-request-burn behavior.
- Scope:
  - docs-first packet and registry/checklist mirrors
  - machine-checkable restart/churn evidence
  - `stalled_after_ms=45000` diagnostics for phase/request/claim context
  - bounded recovery that preserves active provider workers
  - post-recovery verification through `co-status --format json`
- Constraints:
  - do not change `CO-210` child-lane manifest hydration semantics
  - do not collapse the issue into attach-only recovery from `CO-179`
  - do not regress `CO-194`, `CO-163`, `CO-179`, `CO-119`, or `CO-41`
  - keep this child lane docs-only

## Issue-Shaping Contract
- User-request translation carried forward: Apr 17 churn is not healthy steady-state behavior even when supervisor recovery succeeds; the lane must explain and fix the re-entry condition, preserve healthy active workers, and emit machine-checkable restart-series evidence.
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
  - restart-series evidence should be machine-checkable and artifact-backed
  - genuine stuck refreshes must still surface `provider_refresh_lifecycle_stuck` and `restart_required=true`
  - request-budget/no-request-burn safeguards after `restart_required=true` remain authoritative
- Target truth / intended delta:
  - one issue-scoped artifact records restart series, `owner rotations`, `refresh phases`, `surviving provider workers`, current provider keys, and stuck-phase metadata
  - diagnostics identify which phase/request/claim exceeded `stalled_after_ms=45000`
  - the re-entry condition is fixed or quarantined so healthy active workers do not cause repeated restart churn
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
  - active provider workers are killed or restarted as part of recovery
  - `CO-210` child-lane manifest hydration semantics are changed
- Pre-implementation issue-quality review evidence:
  - 2026-04-17: docs child lane reviewed the current issue body through the packaged read-only `linear issue-context` helper and approved the wider churn/observability framing. The issue is not plausibly narrower than the user's request because it explicitly requires restart-series evidence, `owner rotations`, `refresh phases`, `surviving provider workers`, `stalled_after_ms=45000` diagnostics, worker-preserving recovery, request-budget/no-request-burn safety, and post-recovery `co-status --format json` truth while keeping `CO-210` out of scope. The micro-task path is ineligible.
- Safeguard ownership split:
  - child lane owns packet files plus listed registry/checklist mirrors
  - parent lane owns source/test inspection, implementation, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and patch integration

## Technical Requirements
- Functional requirements:
  - persist machine-checkable restart/churn evidence so future agents can reconstruct restart series, `owner rotations`, `refresh phases`, and `surviving provider workers`
  - diagnose which refresh phase, request, or claim class exceeds `stalled_after_ms=45000`
  - include operation age, queued/checking state, and current provider keys in the stuck evidence
  - fix or quarantine the root re-entry condition so healthy active provider workers do not cause repeated restart churn
  - preserve fail-closed truth for genuine stuck refreshes
  - preserve active `provider-linear-worker` issue processes during recovery
  - preserve `CO-163` / `CO-179` no-request-burn behavior after `restart_required=true`
  - verify post-recovery health through `co-status --format json`
  - preserve a focused no-regression path for `CO-194`
- Non-functional requirements:
  - additive observability only; no hidden behavior
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
  - record one authoritative restart/churn artifact instead of scattering evidence across transient logs
  - keep `co-status --format json` as verification rather than the only observability surface
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
  - post-recovery `polling.stuck` and `polling.restart_required` values
- Data model changes / migrations:
  - additive fields in existing JSON artifacts or one new bounded artifact under the issue task path are acceptable
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
  - focused no-regression coverage for `CO-194`
  - manifest-backed docs-review before implementation
  - parent-selected implementation validation after source edits
  - post-recovery `co-status --format json` proof with `polling.stuck=false` and `polling.restart_required=false`

## Open Questions
- Which lifecycle seam should own the restart-series artifact so provider polling, supervision, and status agree?
- What is the smallest safe fix if healthy active workers and repeated restart churn only intersect through one retained refresh-state re-entry path?
- Should the stuck-boundary artifact attach request/claim classification inline or summarize it after recovery?

## Approvals
- Reviewer: docs child lane self-review for packet shape and issue-shaping contract.
- Date: 2026-04-17
