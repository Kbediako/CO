# ACTION_PLAN - CO-374 archive Core Lane dispatch discovery break

## Summary
- Goal: remove the avoidable archive Core Lane dispatch delay after exactly one new run id is found.
- Scope: workflow discovery-loop control flow, focused workflow tests, task registry mirrors, Linear workpad, validation, PR handoff.
- Assumptions: the existing baseline/delta discovery and status mirroring are correct; only the missing `break` after a successful candidate is defective.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `Dispatch Core Lane for archive PR`, `CANDIDATE_RUN_ID`, `RUN_ID`, `gh run watch`, `Core Lane`, `.github/workflows/archive-automation-base.yml`.
- Not done if: discovery still sleeps after `RUN_ID` assignment, ambiguity failure is weakened, status mirroring changes, or validation cannot prove break-before-sleep ordering.
- Pre-implementation issue-quality review: live Linear context showed `Ready`, no attached PR, `In Progress` as started state, and acceptance criteria matching the narrow workflow loop defect.

## Milestones & Sequencing
1. Create/update the Linear workpad, transition to `In Progress`, record the required parallelization decision, and launch the tests-only child lane.
2. Patch `.github/workflows/archive-automation-base.yml` so the loop breaks immediately after `RUN_ID` assignment.
3. Accept the child harness and reconcile existing archive workflow tests.
4. Register the docs/spec/task packet so guard surfaces can reason about the issue.
5. Run focused tests, guard/build/lint/test/docs gates, standalone review, and elegance review.
6. Open or update the PR, attach it to Linear, run the ready-review drain, then move to `In Review` only when clean.

## Dependencies
- Existing `CO-356` archive Core Lane dispatch/status contract.
- GitHub CLI behavior in the hosted archive workflow.
- Same-issue child lane `dispatch-validation` for focused test harness evidence.

## Validation
- Checks / tests:
  - focused Vitest archive workflow specs
  - repo guard/build/lint/test/docs validation
  - standalone review and elegance pass before review handoff
- Completed evidence:
  - focused Vitest passed for `tests/archive-automation-workflow.spec.ts` and `tests/archive-automation-core-lane-dispatch.spec.ts`
  - local validation floor passed through diff budget and `git diff --check`
  - standalone review telemetry `../../.runs/linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f/cli/2026-04-25T17-47-06-075Z-eae318bc/review/telemetry.json` reports `status=succeeded` / `review_outcome=bounded-success`
  - elegance review at `out/linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f/manual/elegance-review.md` found no simplification edits
- Rollback plan: revert the workflow/test/docs packet; archive automation returns to the previous bounded polling behavior and remains visibly slow rather than silently changing status semantics.

## Risks & Mitigations
- Risk: the fix accidentally accepts ambiguous run matches.
- Mitigation: keep ambiguity detection inside `find_dispatched_run_id` unchanged and add focused coverage for multiple new ids.
- Risk: the test only asserts a textual `break` without ordering.
- Mitigation: assert the `break` appears after `RUN_ID` assignment and before the next `sleep 15`.
- Risk: status mirroring regresses while changing discovery.
- Mitigation: leave status code unchanged and keep existing workflow contract tests for pending/success/failure/error status paths.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-26
