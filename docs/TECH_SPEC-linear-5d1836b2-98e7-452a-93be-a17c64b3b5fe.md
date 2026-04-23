---
id: linear-5d1836b2-98e7-452a-93be-a17c64b3b5fe
title: Control host supervision stale co-status endpoint and probe-timeout recurrence
relates_to: docs/PRD-linear-5d1836b2-98e7-452a-93be-a17c64b3b5fe.md
risk: medium
owners:
  - Codex
last_review: 2026-04-23
---

## Summary
- Objective: close `CO-336` by aligning supervision health probing with direct `co-status --format json` endpoint recovery and adding restart/probe diagnostics.
- Scope: `orchestrator/src/cli/coStatusAttachCliShell.ts`, `orchestrator/src/cli/controlHostSupervisionCliShell.ts`, `orchestrator/src/cli/control/controlHostSupervision.ts`, and focused tests.
- Constraints: no live host restart or provider-worker kill; preserve fail-closed behavior for real dead hosts and `restart_required=true`.

## Issue-Shaping Contract
- User-request translation carried forward: validate and fix the recurrence where stale `control_endpoint.json` / dead-port `co-status --format json` and supervision `probe_timeout` flapping recur after prior completed fixes.
- Protected terms / exact artifact and surface names: `control_endpoint.json`, `co-status --format json`, `ECONNREFUSED`, `probe_timeout`, `control-host supervise status --format json`, `restart_count`, `/ui/data.json`, endpoint rotation, healthy active provider workers, `provider-intake-state.json`.
- Nearby wrong interpretations to reject: not a provider stdin bootstrap fix, not queue/admission cap drift, not manual host reset, not closed by one later successful status read.
- Explicit non-goals carried forward: no CO STATUS redesign, no weakening stuck/restart-required alarms, no provider-worker kill/restart, no queue policy expansion.

## Parity / Alignment Matrix
- Current truth: direct JSON status uses endpoint recovery, but supervision can timeout the whole `co-status` subprocess after 10s while the status read path itself waits up to 15s for `/ui/data.json`.
- Reference truth: the supervision probe should let the status read contract complete or classify the failure before counting an unhealthy sample.
- Target truth / intended delta: default supervision probe budget covers stale-endpoint recovery's two direct status read windows plus bounded headroom, while preserving a finite cap; restart records expose probe duration; tests prove slow healthy reads are accepted and true command timeouts still fail closed.
- Explicitly out-of-scope differences: queue/admission, stale-owner reclaim, stdin bootstrap, and broad status UI behavior.

## Readiness Gate
- Not done if: probe budget remains shorter than status read timeout, diagnostics omit probe duration, or regression coverage cannot simulate the recurrence.
- Pre-implementation issue-quality review evidence: source inspection found the first concrete owner in supervision probe coupling, not direct stale endpoint recovery: `probeControlHostHealth` shells out to `co-status --format json` with a 10s cap while `fetchUiDataset` defaults to a 15s request timeout.
- Safeguard ownership split: parent owns implementation and tests in the same bounded file cluster; no child lane is safe before source classification completes.

## Technical Requirements
- Functional requirements: expose the status read timeout constant to supervision, compute a probe timeout with headroom over two status-read attempts for stale endpoint recovery, include probe duration metadata in health probe results and restart history, and preserve stale endpoint retry behavior.
- Non-functional requirements: bounded timeouts, no new network calls beyond existing status reads, no live worker mutation.
- Interfaces / contracts: `control-host supervise status --format json` may include additive optional `last_probe_duration_ms` and restart-history `probe_duration_ms`.

## Architecture & Data
- Architecture / design adjustments: keep status endpoint recovery in `coStatusAttachCliShell.ts`; keep health classification in `control/controlHostSupervision.ts`; keep launchd supervision in `controlHostSupervisionCliShell.ts`.
- Data model changes / migrations: additive optional state/restart fields only; old state files remain readable.
- External dependencies / integrations: none.

## Validation Plan
- Tests / checks: focused Vitest coverage for timeout calculation, slow successful probe, timed-out probe fail-closed behavior, and restart-record probe duration persistence.
- Rollout verification: run scoped tests, build, and required guard/review gates before handoff.
- Monitoring / alerts: operators can inspect status JSON restart history for probe duration and failure reason.

## Open Questions
- None.

## Approvals
- Reviewer: standalone review found the initial one-read timeout budget too narrow for stale-endpoint recovery; the implementation now covers two read attempts plus headroom and the post-fix standalone/elegance reviews found no actionable regressions.
- Date: 2026-04-23
