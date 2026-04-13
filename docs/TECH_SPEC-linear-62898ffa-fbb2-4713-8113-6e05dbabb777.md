---
id: 20260411-linear-62898ffa-fbb2-4713-8113-6e05dbabb777
title: CO: Reinvestigate current-main npm run test failure in ProviderIssueHandoff snapshot-only Todo retry path
relates_to: docs/PRD-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md
risk: medium
owners:
  - Codex
last_review: 2026-04-11
---
## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`
- PRD: `docs/PRD-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`
- Task checklist: `tasks/tasks-linear-62898ffa-fbb2-4713-8113-6e05dbabb777.md`

## Traceability
- Linear issue: `CO-150` / `62898ffa-fbb2-4713-8113-6e05dbabb777`
- Linear URL: https://linear.app/asabeko/issue/CO-150/co-reinvestigate-current-main-npm-run-test-failure-in

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: restore truthful repo-wide `npm run test` behavior by reproducing and fixing or documenting the `ProviderIssueHandoff` snapshot-only Todo retry timeout-count failure.
- Scope:
  - docs-first packet and single Linear workpad for `CO-150`
  - fresh current-main reproduction of the exact failing case
  - bounded source/test inspection of snapshot-only Todo retry scheduling and persisted non-terminal blocker metadata
  - smallest implementation or validation-contract repair needed to make `npm run test` truthful again
- Constraints:
  - do not route this blocker into `CO-128`
  - do not broaden into generic provider cleanup
  - do not hide the failure by inflating timeouts or weakening validation
- Current outcome:
  - current `origin/main` `6d7ab74f8` validates cleanly for the issue-reported snapshot-only Todo surface after rebasing this branch; focused snapshot-only Todo subset, full `ProviderIssueHandoff.test.ts`, and repo-wide `npm run test` all pass
  - the reported non-terminal `continues...` test/line anchor is stale relative to current source; the current non-terminal anchor is the `releases...` test around line 6686
  - later PR Core Lane failures exposed nearby queued retry timer test races; the production retry implementation remains unchanged, and the affected tests now advance the fake timer clock synchronously instead of invoking captured timeout callbacks by hand

## Technical Requirements
- Functional requirements:
  - reproduce the current active non-terminal snapshot-only Todo retry anchor, currently `releases snapshot-only Todo retries when persisted blocker metadata is still non-terminal` around `ProviderIssueHandoff.test.ts:6686`, while preserving the issue-reported `continues...` wording as traceability
  - identify whether the second scheduled timeout is duplicate scheduling, intentional rescheduling that the test should encode, or a nearby retry-state artifact; current-main evidence identifies no live second-timeout production failure to repair
  - preserve snapshot-only Todo release behavior for issues with non-terminal blocker metadata, and preserve continued retry behavior only for issues with terminal blocker metadata
  - ensure the final test contract proves the intended queued retry dispatch after refresh by driving Vitest fake timers deterministically
- Non-functional requirements (performance, reliability, security):
  - keep fake-timer behavior deterministic
  - avoid adding network dependencies or live Linear calls to tests
  - keep retry metadata provenance understandable for future provider-worker reviews
- Interfaces / contracts:
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - persisted blocker metadata and retry scheduling state used by provider handoff refresh

## Architecture & Data
- Architecture / design adjustments:
  - prefer a local fix at the retry-scheduling guard if duplicate timers are real
  - prefer a test-contract update only if source evidence proves the second timeout is intended and safe
  - avoid introducing a new retry abstraction unless the existing seam cannot express the correct state transition
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - Vitest fake timers
  - repo-wide `npm run test`

## Validation Plan
- Tests / checks:
  - focused reproduction with `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "snapshot-only Todo retries"`
  - full ProviderIssueHandoff file reproduction with `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts`
  - full `npm run test` after the bounded fix or contract update, or as the validation-contract proof when no snapshot-only Todo failure reproduces
  - normal repo validation floor for non-trivial diffs before review handoff
- Rollout verification:
  - exact failure case no longer reports `expected 1, observed 2` without explanation
  - full suite is green or any remaining blocker has a dedicated repo-owned contract
  - evidence logs are stored under `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/`
- Monitoring / alerts:
  - rely on test evidence and Linear workpad notes

## Open Questions
- Resolved for the issue-reported snapshot-only Todo surface on current `origin/main`: no duplicate/extra timeout failure reproduced, so no production implementation seam is currently implicated.
- Resolved for the later PR Core Lane failures: affected queued-retry overlap tests should use synchronous `vi.advanceTimersByTime(...)` so the timer callback dispatches before lock-gating assertions while blocked refresh or launch promises still control completion.

## Approvals
- Reviewer: docs-review clean after packet fixes
- Date: 2026-04-11
