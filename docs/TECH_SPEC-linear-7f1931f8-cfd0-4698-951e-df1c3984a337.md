---
id: 20260406-linear-7f1931f8-cfd0-4698-951e-df1c3984a337
title: CO STATUS: bound provider proof session-log refresh cost
relates_to: docs/PRD-linear-7f1931f8-cfd0-4698-951e-df1c3984a337.md
risk: high
owners:
  - Codex
last_review: 2026-04-06
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-7f1931f8-cfd0-4698-951e-df1c3984a337.md`
- PRD: `docs/PRD-linear-7f1931f8-cfd0-4698-951e-df1c3984a337.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7f1931f8-cfd0-4698-951e-df1c3984a337.md`
- Task checklist: `tasks/tasks-linear-7f1931f8-cfd0-4698-951e-df1c3984a337.md`

## Summary
- Objective: make repeated in-progress provider-proof session-log hydration incremental or equivalently bounded so root `CO STATUS` refreshes stop rereading the same `rollout-*.jsonl` bytes from zero for the same active worker.
- Scope: trace the in-progress proof refresh path from `selectedRunProjection.ts` into `refreshProviderLinearWorkerProofSnapshot(...)`, add the smallest safe persisted hydration state for the same active session-log file, preserve authoritative runtime telemetry for `Tokens`, `SESSION`, `Throughput`, and Codex `5-hour` / `weekly`, and add focused repeated-refresh regression coverage.
- Constraints: no cadence-throttling-only mitigation, no heuristic tail read that can miss authoritative telemetry updates, and no schema churn outside the bounded hydration state this optimization needs.

## Technical Requirements
- Functional requirements:
  - repeated in-progress proof refreshes for the same active worker must not reread the already-consumed session-log bytes from byte `0`
  - the refresh path must still surface truthful `Tokens`, `SESSION`, `Throughput`, and Codex `5-hour` / `weekly` telemetry when new session-log data arrives
  - the implementation must safely fall back to a full reread when the active session-log file changes, truncates, or otherwise invalidates the persisted cursor
  - tests must cover repeated refreshes against a growing `rollout-*.jsonl` file and prove bounded rereads plus correctness
- Non-functional requirements:
  - keep refresh work bounded by newly appended data for the stable-file case
  - keep allocation and parsing state minimal
  - preserve existing proof/projection truthfulness semantics from `CO-98`
- Interfaces / contracts:
  - caller: `orchestrator/src/cli/control/selectedRunProjection.ts`
  - proof refresh owner: `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - persisted proof artifact: `provider-linear-worker-proof.json`
  - session-log input: active `rollout-*.jsonl` file discovered for the provider-worker workspace

## Architecture & Data
- Architecture / design adjustments:
  - persist an opaque hydration cursor for the current session-log file, so `refreshProviderLinearWorkerProofSnapshot(...)` can resume parsing from the last consumed byte instead of recreating a zero-offset tail state each time, and track a proof-signature drift guard so stale cursor state is not replayed onto a newer proof snapshot
  - key cursor reuse to the current discovered session-log path and reset it when the file path, size progression, or other trust signals indicate rotation/truncation/mismatch
  - keep the existing parser and telemetry derivation authoritative; the bounded change is in how much of the file each refresh must revisit
- Data model changes / migrations:
  - additive proof-side hydration metadata is acceptable if it stays bounded, internal, and tied to session-log refresh resumption
  - no external migration or cross-artifact schema rollout is expected
- External dependencies / integrations:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - active provider-worker `rollout-*.jsonl` files

## Parity / Alignment Matrix
- Current truth:
  - the live control-host path now reads truthful provider-worker runtime telemetry, but in-progress proof refresh still restarts session-log hydration at byte `0`
  - repeated refreshes therefore do redundant `O(file-size)` work for the same growing file
- Reference truth:
  - `CO-98` restored authoritative runtime telemetry and must remain the correctness baseline
- Target truth / intended delta:
  - truthful runtime telemetry remains unchanged while repeated refresh work becomes incremental or equivalently bounded for the stable-file case
- Explicitly out-of-scope differences:
  - refresh-cadence changes instead of hydration-state changes
  - heuristics that can miss updates
  - unrelated provider-proof or UI redesign work

## Validation Plan
- Tests / checks: audited `linear child-stream --pipeline docs-review`, focused repeated-refresh regressions in the provider-worker / projection test suite, and the required repo validation floor before review handoff.
- Rollout verification: verify the refreshed proof/projection path still publishes truthful telemetry for the protected root `CO STATUS` fields and reuses bounded hydration state instead of repeating byte-zero rereads in the stable-file case.
- Monitoring / alerts: no new monitoring surface is required; focused tests and review evidence are sufficient for this bounded follow-up.

## Approvals
- Reviewer: `codex-orchestrator docs-review`
- Date: 2026-04-06
- Manifest: `.runs/linear-7f1931f8-cfd0-4698-951e-df1c3984a337-co-99-docs-review-r2/cli/2026-04-05T23-12-59-925Z-cae6b004/manifest.json`
- Review telemetry: `.runs/linear-7f1931f8-cfd0-4698-951e-df1c3984a337-co-99-docs-review-r2/cli/2026-04-05T23-12-59-925Z-cae6b004/review/telemetry.json` (`status=succeeded`, `review_outcome=clean-success`)
