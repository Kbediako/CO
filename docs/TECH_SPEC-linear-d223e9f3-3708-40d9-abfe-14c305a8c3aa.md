---
id: 20260330-linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa
title: CO: Auto-resume or fail explicitly after interrupted Merging-stage merge drain
relates_to: docs/PRD-linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md
risk: high
owners:
  - Codex
last_review: 2026-03-30
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`
- PRD: `docs/PRD-linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`
- Task checklist: `tasks/tasks-linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`

## Traceability
- Linear issue: `CO-51` / `d223e9f3-3708-40d9-abfe-14c305a8c3aa`
- Linear URL: https://linear.app/asabeko/issue/CO-51/co-auto-resume-or-fail-explicitly-after-interrupted-merging-stage
- Required baseline: `/Users/kbediako/Code/CO/.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1/cli/2026-03-30T07-55-18-395Z-e26e1404/*`
- Related evidence issues: `CO-40`, `CO-41`

## Summary
- Objective: Make `Merging`-stage provider-worker continuation recover automatically after transient merge-drain interruptions when the PR later returns to clean mergeable state, or fail explicitly with machine-checkable operator guidance.
- Scope:
  - docs-first registration for `CO-51`
  - inspection of the `CO-41` / PR `#324` interruption baseline
  - provider-worker / handoff changes around merge-drain interruption, retry, and terminal-state recording
  - operator-facing proof and audit improvements for quiet-window start, interruption reason, retry decision, and final outcome
  - focused regression coverage for the late-review interruption then clean recovery sequence
- Constraints:
  - keep stale claim pickup and refresh-lifecycle stall classes out of scope
  - preserve fail-closed behavior when the PR never returns to clean mergeable state
  - avoid widening into generic CI healing or unrelated review automation changes

## Technical Requirements
- Functional requirements:
  - detect when a `Merging`-stage merge drain exits because late review or check activity appeared during the quiet window
  - distinguish transient interruptions that can be retried from terminal blocking states that need operator action
  - automatically resume or re-arm merge completion when the PR returns to `OPEN`, `MERGEABLE`, `CLEAN`, with unresolved review threads at `0`
  - emit explicit machine-checkable terminal/action-required results when automatic recovery is unsafe, exhausted, or the PR never returns to clean mergeable state
  - record operator-facing lifecycle evidence for quiet-window start, interruption reason, retry decision, and final terminal outcome
- Non-functional requirements (performance, reliability, security):
  - keep provider-worker ownership and issue-state truth stable through the `Merging` continuation
  - do not create duplicate merge attempts or unsafe auto-merge behavior while checks or reviews are still unstable
  - preserve auditable artifacts in proof/log/audit outputs so operators can tell why merge completion stopped or resumed
- Interfaces / contracts:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - merge helper surfaces behind `codex-orchestrator pr ready-review` and `pr resolve-merge`
  - provider-worker proof and Linear audit artifacts

## Architecture & Data
- Architecture / design adjustments:
  - classify merge-drain interruptions into retryable versus explicit-action-required outcomes
  - extend continuation handling so a retryable interruption can resume after clean-state recovery instead of silently ending the `Merging` lane
  - persist lifecycle markers covering merge-drain start, interruption, retry decision, and final outcome in existing operator artifacts
- Data model changes / migrations:
  - likely widen proof and/or Linear audit payloads with merge lifecycle fields or event records
  - no durable repo data migration expected
- External dependencies / integrations:
  - baseline `CO-41` worker manifest, runner log, and Linear audit evidence
  - GitHub PR state as observed by the shipped merge helper

## Validation Plan
- Tests / checks:
  - focused provider-worker / handoff / merge-watch regressions for the interruption-and-clean-recovery sequence
  - required repo validation floor after implementation
- Rollout verification:
  - real or simulated proof of the `CO-41` / `#324` interruption class showing either automatic merge completion or explicit actionable failure
  - workpad and artifacts refreshed with the final retry/resume outcome
- Monitoring / alerts:
  - rely on provider-worker proof, Linear audit, and merge helper logs for this lane

## Open Questions
- Should retryable interruption state live only in the worker proof, or also in intake claim / handoff state so control-host can reason about stranded `Merging` lanes?
- What bounded retry budget is safe before the worker should stop and emit explicit action-required guidance?

## Approvals
- Reviewer: docs-review approved via `/Users/kbediako/Code/CO/.runs/linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa-docs-review/cli/2026-03-30T09-32-57-435Z-ab077912/manifest.json` (wrapper returned `provider_worker_child_stream_output_invalid` after prepended logs, so the manifest-backed success is recorded directly)
- Date: 2026-03-30
