---
id: 20260323-1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up
title: Coordinator Live Provider Issue Handoff Retry-Timer CI Determinism Follow-Up
status: in_progress
owner: Codex
created: 2026-03-23
last_review: 2026-03-23
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md
related_action_plan: docs/ACTION_PLAN-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md
related_tasks:
  - tasks/tasks-1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md
review_notes:
  - 2026-03-23: Opened for Linear issue CO-3 after GitHub Actions run `23425656167` failed `main` on one `ProviderIssueHandoff` retry-timer test immediately after merge commit `bf21eb3c12d34e759e393e6e685442c4ea97c572`.
  - 2026-03-23: Current evidence still points to a CI/test determinism issue, not a reproduced runtime retry-owner bug.
  - 2026-03-23: This workspace starts from later mainline head `d07210d205e0855ef14fcf135c59a0ce64db1f72`; the task must preserve that distinction in its classification.
  - 2026-03-23: Delegation is override-only in this provider-worker run because `spawn_agent` is unavailable without explicit user authorization in the session tool policy.
  - 2026-03-23: docs-review succeeded via `.runs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up/cli/2026-03-23T08-09-20-460Z-277a65a8/manifest.json`.
  - 2026-03-23: Focused current-head reproduction passed `100/100` repeated `CI=1` runs before the seam change, so no runtime retry-owner bug was reproduced locally.
  - 2026-03-23: The chosen fix stays in tests: the integration assertion now stops at `newer retry_due_at wins / no early fire`, and `ProviderIssueRetryQueue.test.ts` owns the direct timer replacement fire path.
  - 2026-03-23: Full `npm run test` passes under `CI=1 env -i ...` because the provider-worker shell exports orchestration env vars that contaminate unrelated `Doctor` and `run-review` precedence tests.
  - 2026-03-23: `npm run review` finished with no findings at `.runs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up/cli/2026-03-23T08-09-20-460Z-277a65a8/review/output.log`.
  - 2026-03-23: Explicit elegance review kept the change test-only; no further simplification or runtime edit was justified.
---

# Technical Specification

## Context

`1315` landed the retry-owner runtime seam, but `main` later went red on a single fake-timer regression in `ProviderIssueHandoff.test.ts`. The failing case specifically verifies that rehydrating with a newer persisted `retry_due_at` cancels and replaces the older queued retry timer. The CI failure is currently in the test observation path (`Condition not met after 256 timer turns.`), not in a reproduced runtime claim about duplicate launches or wrong due times.

## Requirements

1. Register `1320` as the post-merge mainline recovery lane for the retry-timer regression.
2. Keep the docs/workpad classification truthful: real `main` failure, currently test determinism unless runtime evidence changes that.
3. Maintain one active Linear workpad comment for the current attempt.
4. Reproduce or otherwise classify the failing test on the current head before widening scope.
5. Land the smallest deterministic fix for the retry-timer seam.
6. Avoid runtime behavior changes unless a focused reproduction shows the queue/handoff seam is actually wrong.
7. Record a truthful delegation-guard override because this run cannot spawn subagents under the session tool policy.
8. Run the required validation floor before review handoff.

## Current Truth

- Failing run: GitHub Actions `23425656167`, job `68139836805`, event `push`, branch `main`, head `bf21eb3c12d34e759e393e6e685442c4ea97c572`.
- Failing test: `orchestrator/tests/ProviderIssueHandoff.test.ts > createProviderIssueHandoffService > cancels and replaces queued retry ownership when a newer persisted due_at supersedes an older timer`.
- Failure text: `Condition not met after 256 timer turns.`
- Current fix head in this workspace: `d07210d205e0855ef14fcf135c59a0ce64db1f72`.
- No CO-3 PR is attached yet; the Linear issue is `In Progress`.

## Validation Plan

- docs-review before implementation
- focused reproduction/stress of the failing `ProviderIssueHandoff` case
- `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run cannot spawn subagents because spawn_agent is disallowed without explicit user request in this session." node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `CI=1 env -i HOME="$HOME" PATH="$PATH" SHELL="$SHELL" TERM="${TERM:-xterm-256color}" npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- review
- `npm run pack:smoke` if downstream-facing surfaces are touched
