# PRD - Coordinator Live Provider Issue Handoff Retry-Timer CI Determinism Follow-Up

## Added by Bootstrap 2026-03-23

## Summary
- Problem Statement: `main` regressed immediately after merge commit `bf21eb3c12d34e759e393e6e685442c4ea97c572` when GitHub Actions run `23425656167` failed the Core Lane `Test` step on exactly one case: `orchestrator/tests/ProviderIssueHandoff.test.ts > createProviderIssueHandoffService > cancels and replaces queued retry ownership when a newer persisted due_at supersedes an older timer`. The failure was `Condition not met after 256 timer turns.` The merged diff did not touch `ProviderIssueHandoff` runtime files, and current evidence still points to a CI-only fake-timer/test-seam regression rather than a reproduced production retry-owner bug.
- Desired Outcome: restore `main` to green with the smallest truthful follow-up. The lane must classify the post-merge failure accurately in docs-first artifacts, land a minimal determinism fix for the retry-timer test seam on the current head, and avoid widening scope into unrelated runtime changes unless a real retry-owner defect is reproduced locally.

## Status Update - 2026-03-23
- Live Linear issue `CO-3` (`902af7c9-9c23-4805-a652-5280723334d7`) is currently `In Progress` with no attached PR and no existing workpad comment.
- The failing Actions run was a `push` run on `main` for head `bf21eb3c12d34e759e393e6e685442c4ea97c572`; the only failing test in job `68139836805` was the retry-timer case above.
- This workspace is starting from later mainline head `d07210d205e0855ef14fcf135c59a0ce64db1f72` (`Merge pull request #287`), so the follow-up must remain truthful about the original failure commit while landing the fix on the current branch tip.
- Provider-worker delegation is override-only in this run because the current tool policy does not permit `spawn_agent` without an explicit user request. The task records that constraint rather than fabricating subagent evidence.
- docs-review for `1320` succeeded at `.runs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up/cli/2026-03-23T08-09-20-460Z-277a65a8/manifest.json`.
- Focused current-head reproduction stayed green before the fix: the exact failing case passed once under `CI=1`, then passed `100/100` repeated `CI=1` runs on `d07210d205e0855ef14fcf135c59a0ce64db1f72`.
- The landed fix remains test-only and narrows the assertion boundary instead of changing retry-owner behavior: `ProviderIssueHandoff.test.ts` now proves that the newer persisted `retry_due_at` wins and does not fire early, while `ProviderIssueRetryQueue.test.ts` owns the direct timer-replacement fire assertion without background best-effort rehydrate noise.
- Required local validation is green, including a sanitized-shell `npm run test`, `npm run docs:check`, `npm run docs:freshness`, and `node scripts/diff-budget.mjs`.
- `npm run review` completed with no findings, and the explicit elegance pass found no smaller safe alternative than the current test-only split.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat `CO-3` as the active worker issue, bootstrap the docs/workpad flow correctly, inspect the live issue/team workflow, and then complete a bounded follow-up that fixes the post-merge Core Lane retry-timer regression without overstating it as a runtime parity bug unless that bug is actually reproduced.
- Success criteria / acceptance:
  - docs-first artifacts state that the post-merge failure on `main` is real, but currently classified as a test determinism problem until runtime evidence says otherwise
  - a minimal fix lands for the retry-timer seam in `ProviderIssueHandoff` coverage without unrelated behavior changes
  - required validation and PR checks return green
  - `main` is restored to green after the follow-up merges
- Constraints / non-goals:
  - do not widen into new retry-owner/runtime design work unless the current head reproduces a real bug outside the test harness
  - do not weaken delegation guard; use an explicit override reason because this provider-worker run cannot legally spawn subagents under the current tool policy
  - keep exactly one active Linear workpad comment and attach the PR before review handoff

## Goals
- Register a truthful post-merge follow-up task for the retry-timer regression on `main`.
- Reproduce and classify the failing test on the current head with explicit CI evidence.
- Stabilize the retry-timer test seam with the smallest correct change.
- Preserve current retry-owner runtime behavior unless a real defect is reproduced.
- Carry the issue through validation and review-ready handoff discipline.

## Non-Goals
- Reopening the broader retry-owner parity work from `1315`.
- Refactoring `providerIssueRetryQueue.ts` or `providerIssueHandoff.ts` for style-only reasons.
- Claiming a production/runtime fix when the evidence remains test-only.
- Broadening into unrelated Core Lane failures or legacy PR cleanup not required by `CO-3`.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - the failing case becomes deterministic on local current head and in PR CI
  - no other tests regress in the implementation lane
  - docs/workpad/Linear state remain aligned with the real failure classification
- Guardrails / Error Budgets:
  - preserve runtime behavior when the failure remains confined to fake timers and test polling
  - record the exact delegation override reason instead of bypassing the repo guard implicitly
  - keep the diff bounded to the retry-timer seam plus required docs/task/workpad updates

## User Experience
- Personas:
  - CO operator watching `main` health after a merge
  - reviewer validating whether this was a real product/runtime regression or a CI-only test problem
- User Journeys:
  - `main` fails after merge on one retry-timer test, a follow-up issue is opened, and the worker lands a narrow fix without destabilizing provider behavior
  - the issue retains one workpad comment that clearly reflects the current attempt, validation status, and review handoff state

## Technical Considerations
- Architectural Notes:
  - the failing surface currently combines fake timers, persisted `retry_due_at` replacement, `service.rehydrate()`, and polling via `waitForCondition()` / `waitForMockCalls()`
  - the runtime retry-owner seam lives in `orchestrator/src/cli/control/providerIssueRetryQueue.ts` and is consumed by `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - current-head reproduction continued to point to harness ordering rather than runtime logic, so the chosen fix tightens the test seam and shifts the late-fire assertion into the dedicated queue unit test instead of widening runtime behavior
  - if a real runtime ordering bug appears under focused reproduction, the fix may touch the queue/handoff seam, but only with explicit proof
- Dependencies / Integrations:
  - GitHub Actions run `23425656167`
  - job `68139836805`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/src/cli/control/providerIssueRetryQueue.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`

## Open Questions
- None at the current checkpoint. The evidence still points to a CI-only test determinism problem, and the direct replacement-fire assertion now lives in the retry-queue unit suite.

## Approvals
- Product: Self-approved on 2026-03-23 for a bounded post-merge mainline recovery lane.
- Engineering: Self-approved on 2026-03-23 against the failing CI evidence and current-head repo state.
- Design: N/A
