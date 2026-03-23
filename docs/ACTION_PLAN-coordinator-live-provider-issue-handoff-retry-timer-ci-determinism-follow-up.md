# ACTION_PLAN - Coordinator Live Provider Issue Handoff Retry-Timer CI Determinism Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: restore `main` health after the post-merge retry-timer regression with the smallest truthful fix.
- Scope: docs-first/bootstrap, focused CI/test investigation, minimal determinism fix, required validation, PR/review handoff.
- Assumptions:
  - the post-merge failure is real on `main`, but currently isolated to one fake-timer test
  - this run cannot spawn subagents, so delegation guard needs an explicit override
  - current head may differ from the failing merge commit, so the issue narrative must preserve both facts

## Milestones & Sequencing
1. Register `1320`, mirror the checklist, update the task snapshot, and create the initial Linear workpad comment.
2. Reproduce and classify the failure:
   - inspect the GitHub Actions failure and current retry-timer test code
   - run focused local reproduction/stress on the current head
   - decide whether the problem is test-only or a real runtime defect
3. Land the smallest correct fix:
   - prefer a deterministic test/helper adjustment if runtime remains correct
   - touch runtime code only if focused reproduction proves a real bug
4. Run the validation floor, refresh docs/workpad, and prepare the branch/PR for `In Review` handoff.

## Dependencies
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/src/cli/control/providerIssueRetryQueue.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- GitHub Actions run `23425656167`
- Linear issue `902af7c9-9c23-4805-a652-5280723334d7`

## Validation
- Checks / tests:
  - docs-review before implementation
  - focused `ProviderIssueHandoff` reproduction
  - delegation guard with explicit override reason
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `CI=1 env -i HOME="$HOME" PATH="$PATH" SHELL="$SHELL" TERM="${TERM:-xterm-256color}" npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` if required
- Rollback plan:
  - if the minimal fix regresses retry-owner behavior, revert to the pre-fix test/runtime seam and reopen the issue with the reproduced runtime evidence

## Risks & Mitigations
- Risk: mistaking a test harness race for a runtime bug.
  - Mitigation: reproduce the targeted failure first and keep runtime changes evidence-gated.
- Risk: skipping delegation guard requirements because subagents are unavailable.
  - Mitigation: use a documented override reason and record it in the task packet.
- Risk: current head no longer matching the failing merge commit causing narrative drift.
  - Mitigation: record both SHAs explicitly in docs, workpad, and PR summary.

## Approvals
- Reviewer: docs-review completed via `.runs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up/cli/2026-03-23T08-09-20-460Z-277a65a8/manifest.json`.
- Reviewer: implementation review completed clean via `.runs/1320-coordinator-live-provider-issue-handoff-retry-timer-ci-determinism-follow-up/cli/2026-03-23T08-09-20-460Z-277a65a8/review/output.log`.
- Date: 2026-03-23
