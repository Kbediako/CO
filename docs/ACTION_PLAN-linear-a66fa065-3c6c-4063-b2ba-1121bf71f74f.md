# ACTION_PLAN - CO-346 skipped review prerequisite-stage truth

## Summary
- Goal: fix misleading skipped-review wording for known prerequisite-stage failures without creating false prerequisite-stage attribution for non-stage failures.
- Scope: docs-first packet, `TaskManager`, `CommandBuilder`, `BuildResult` typing, and focused tests.
- Assumptions: failed pipeline stages are identifiable from explicit stage/subpipeline `status_detail` or failed command records, while non-stage `status_detail` values should remain generic.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `Review skipped: build stage failed.`, `delegation-guard`, `errors/01-delegation-guard.json`, `cloud-env-missing`, `allowFailure`, `createSkippedReviewResult`.
- Not done if: guard-stage failures still look like generic build failures, true build/test/review failures are mislabeled, or unrelated/advisory artifacts are attached to skipped-review feedback.
- Pre-implementation issue-quality review: parent verified Linear CO-346, the previous PR review sweep, and the fresh Rework reset before implementation.

## Milestones & Sequencing
1. Reset Rework lane: close old PR, remove old workpad, create a fresh branch from `origin/main`, and record parallelization.
2. Create docs-first packet and registry rows.
3. Launch bounded child test lane for focused regressions.
4. Implement prerequisite-stage skip wording, failed-stage derivation, and error artifact propagation.
5. Accept/reject the child test patch and run focused validation.
6. Run full validation, standalone review, elegance review, PR handoff, and review drain.

## Dependencies
- Linear CO-346.
- Existing manager and command-builder adapters.
- Same-issue child lane `review-skip-tests` for focused test coverage.

## Validation
- Checks / tests: focused Vitest files, build, lint, full test, docs gates, repo stewardship, diff budget, standalone review.
- Rollback plan: revert this task packet and the focused manager/adapter/type/test changes.

## Risks & Mitigations
- Risk: overfitting to one `delegation-guard` run.
- Mitigation: derive stage names only from explicit stage/subpipeline status detail or failed command records when no non-stage detail is present.
- Risk: misleading operators with unrelated `errors/` artifacts.
- Mitigation: set `failureArtifactPath` only from the failed stage/command and avoid generic artifact fallback when no stage is known.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-24
