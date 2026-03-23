---
id: 20260323-1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up
title: Coordinator Live Provider Issue Handoff Retry-Timer CI Determinism Follow-Up
relates_to: docs/PRD-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up.md
risk: high
owners:
  - Codex
last_review: 2026-03-23
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: classify and fix the post-merge `ProviderIssueHandoff` retry-timer regression that turned `main` red after `bf21eb3c12d34e759e393e6e685442c4ea97c572`, while preserving the truthful claim that current evidence still points to test determinism unless runtime behavior is reproduced as faulty.
- Scope: docs-first registration, Linear workpad bootstrap, focused reproduction of the failing retry-timer case, minimal code/test fix for determinism, and the required validation/review handoff steps for `CO-3`.
- Constraints:
  - current execution head is `d07210d205e0855ef14fcf135c59a0ce64db1f72`, not the original failing merge commit
  - no subagent delegation is available in this run; validation must use `DELEGATION_GUARD_OVERRIDE_REASON` with a truthful explanation
  - avoid runtime behavior changes unless focused reproduction shows a real defect outside the test harness

## Current Branch State
- Current CI failure baseline:
  - GitHub Actions run `23425656167` on `main` failed job `68139836805`
  - the only failing test was `orchestrator/tests/ProviderIssueHandoff.test.ts > createProviderIssueHandoffService > cancels and replaces queued retry ownership when a newer persisted due_at supersedes an older timer`
  - failure text: `Condition not met after 256 timer turns.`
- Current repo head for the fix:
  - this workspace starts from `d07210d205e0855ef14fcf135c59a0ce64db1f72`
  - no CO-3 PR is attached yet
  - Linear issue `CO-3` is `In Progress`
- Current implementation truth:
  - docs-review succeeded at `.runs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up/cli/2026-03-23T08-09-20-460Z-277a65a8/manifest.json`
  - targeted current-head reproduction stayed green before the fix (`CI=1` single pass plus `100/100` repeated passes)
  - the chosen fix is test-only: `orchestrator/tests/ProviderIssueHandoff.test.ts` now stops at the integration-safe `newer retry_due_at wins / no early fire` boundary, and `orchestrator/tests/ProviderIssueRetryQueue.test.ts` now covers the direct timer replacement fire path
  - full `npm run test` passes under a sanitized `CI=1 env -i ...` shell because the provider-worker shell exports orchestration env that contaminates unrelated precedence tests
  - `npm run review` completed with no findings, and the required elegance pass found no smaller safe alternative than the current test-only split

## Technical Requirements
Functional requirements:
  - create the `1320` docs/task packet and keep it aligned with the exact post-merge failure evidence
  - create and maintain one active `## Codex Workpad` Linear comment for this attempt
  - reproduce or otherwise classify the retry-timer failure on current head using focused test execution
  - land the smallest durable fix that makes the retry-timer seam deterministic
  - keep runtime retry-owner behavior unchanged unless a real bug is reproduced
  - attach a PR before review handoff and stop coding when the issue reaches `In Review`
Non-functional requirements:
  - keep the diff bounded to the retry-timer seam plus required docs/task/workpad changes
  - preserve CI/runtime truthfulness in docs and review notes
  - record a clear delegation override rather than silently skipping the guard
Interfaces / contracts:
  - `ProviderIssueHandoff` retry replacement must still launch only after the newer `retry_due_at`
  - fake-timer coverage must not rely on an eventually-observed condition that can starve in CI despite correct behavior

## Architecture & Data
- Architecture / design adjustments:
  - first preference: tighten the test seam in `orchestrator/tests/ProviderIssueHandoff.test.ts` or shared timer helpers so fake-timer scheduling is drained deterministically
  - second preference, only if reproduced: make a minimal runtime fix in `providerIssueRetryQueue.ts` or `providerIssueHandoff.ts` and keep or add direct unit coverage for that edge
- Data model changes / migrations:
  - none expected unless a real runtime bug is reproduced
  - persisted retry claim fields and retry-owner semantics must remain backward compatible
- External dependencies / integrations:
  - GitHub Actions run `23425656167`
  - Linear issue `902af7c9-9c23-4805-a652-5280723334d7`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/src/cli/control/providerIssueRetryQueue.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`

## Validation Plan
- Tests / checks:
  - `MCP_RUNNER_TASK_ID=1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up npx codex-orchestrator start docs-review --format json --no-interactive --task 1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up`
  - focused reproduction of the failing `ProviderIssueHandoff` case, including repeated `CI=1` passes on current head before and after the seam hardening
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run cannot spawn subagents because spawn_agent is disallowed without explicit user request in this session." node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `CI=1 env -i HOME="$HOME" PATH="$PATH" SHELL="$SHELL" TERM="${TERM:-xterm-256color}" npm run test` because the provider-worker shell exports orchestration env that contaminates unrelated `Doctor` and `run-review` precedence tests
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` if downstream-facing surfaces are touched
- Rollout verification:
  - PR CI must show the retry-timer case green on the fix branch
  - if the change is test-only, the docs/workpad must say so explicitly
- Monitoring / alerts:
  - watch for any new `ProviderIssueHandoff` failures after the targeted fix
  - watch for review feedback claiming a runtime defect not reproduced locally

## Open Questions
- None at the current checkpoint. The fix stayed test-only, the queue unit test now owns the direct replacement-fire assertion, and no runtime defect was reproduced.

## Approvals
- Reviewer: docs-review completed via `.runs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up/cli/2026-03-23T08-09-20-460Z-277a65a8/manifest.json`.
- Reviewer: implementation review completed clean via `.runs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up/cli/2026-03-23T08-09-20-460Z-277a65a8/review/output.log`.
- Date: 2026-03-23
