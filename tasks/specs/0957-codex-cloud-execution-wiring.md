---
id: 20260213-0957-codex-cloud-execution-wiring
title: Codex Cloud Execution Wiring
relates_to: docs/PRD-codex-cloud-execution-wiring.md
risk: high
owners:
  - Codex
last_review: 2026-02-13
---

## Summary
- Objective: Route orchestrator cloud mode through real Codex Cloud task execution while preserving CO manifest and review workflows.
- Scope: Orchestrator mode routing, cloud execution adapters, status polling/retries, manifest schema updates, and phased rollout/test strategy.
- Constraints: Preserve local mode compatibility; keep apply explicit; avoid scope expansion beyond cloud wiring.

## Technical Requirements
- Functional requirements:
  - When `ExecutionMode` resolves to `cloud`, execution must use cloud task APIs rather than local command-stage execution.
  - Add cloud lifecycle support:
    - launch cloud task
    - poll task status to terminal state
    - fetch diff metadata/artifacts
    - support explicit apply flow
  - Map cloud lifecycle results into existing CO result contracts (`BuildResult`, `TestResult`, `ReviewResult`, `RunSummary`).
  - Persist cloud evidence in manifests and task state.
- Non-functional requirements (performance, reliability, security):
  - Transient cloud failures should retry with exponential backoff and bounded attempts.
  - Terminal failures must preserve remote task IDs and diagnostics.
  - Local mode performance/behavior must remain unchanged.
  - Cloud apply must remain explicit, not implicit.
- Interfaces / contracts:
  - `TaskManager`/CLI mode policy must dispatch to a cloud executor path.
  - Manifest schema must include a `cloud_execution` section (nullable for local runs).
  - Event stream should expose cloud status transitions for observability.

## Architecture and Data
- Architecture / design adjustments:
  - Introduce cloud execution components under `orchestrator/src` (target `cloud` module):
    - `CloudTaskExecutor` (launch + orchestrate lifecycle)
    - `CloudStatusPoller` (status checks + retry policy)
    - `CloudDiffManager` (diff metadata retrieval)
    - `CloudApplyManager` (explicit apply action)
    - `CloudRunSummaryAssembler` (map cloud outputs into CO summary types)
  - Update CLI wiring so cloud mode dispatches to cloud executor rather than local command stage runner.
  - Keep persistence path unchanged but extend payload content.
- Data model changes / migrations:
  - Add `cloud_execution` fields to manifest/shared types (proposed):
    - `task_id`
    - `attempt`
    - `status`
    - `status_url`
    - `diff_id`
    - `diff_url`
    - `apply_result`
    - `logs_url`
    - `last_polled_at`
  - Local runs leave `cloud_execution` unset/null.
- External dependencies / integrations:
  - Codex Cloud task APIs surfaced by Codex CLI cloud features.
  - Existing CO cloud sync and credential abstractions where reusable.

## Delivery Plan (Phased)
1. MVP (routing + status):
   - Implement cloud-mode dispatch path.
   - Launch cloud task and poll to completion.
   - Record terminal state + identifiers in manifest summary.
2. Diff/apply evidence:
   - Capture diff metadata for completed cloud runs.
   - Add explicit apply command path and result recording.
3. Observability and hardening:
   - Emit cloud lifecycle events in run stream.
   - Improve retry/error taxonomy and operator diagnostics.

## Failure Modes and Mitigations
- Launch failure after remote task creation:
  - Mitigation: persist remote task ID if available and mark run failed with actionable message.
- Polling interruptions/transient 5xx/429:
  - Mitigation: bounded exponential backoff with retry classification.
- Diff retrieval unavailable:
  - Mitigation: mark cloud run success with `diff_status=unavailable` plus URL/error detail.
- Apply conflicts:
  - Mitigation: preserve patch/application error details and leave working tree untouched unless apply succeeds.

## Validation Plan
- Tests / checks:
  - Unit: cloud executor + poller + summary mapper + retry classification.
  - Unit: manifest serialization for `cloud_execution` payload.
  - Integration: cloud-mode run path through orchestrator with mocked cloud backend.
  - Regression: existing local (`mcp`) mode tests unchanged.
- Rollout verification:
  - Canary task with cloud mode enabled and recorded manifest evidence.
  - Confirm `docs-review` + `implementation-gate` evidence captures new paths.
- Monitoring / alerts:
  - Track cloud launch latency, polling retries, terminal status distribution, and diff/apply success rates.

## Open Questions
- Should apply be modeled as a separate CLI command only, or optionally as a post-run stage?
- Should diff absence be warning or failure by default policy?

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-13
