# ACTION_PLAN - CO-513 suppress same-attempt retries for create-follow-up label-resolution failures

## Summary
- Goal: prevent same-attempt `create-follow-up` retries after `linear_follow_up_label_resolution_failed`.
- Scope: retry classification, CLI suppression guidance, and focused regression coverage.
- Assumptions: CO-482 label resolution remains fail-closed and non-retryable.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `linear_follow_up_label_resolution_failed`, `create-follow-up`, `same-attempt`, `source-label`, `fail-closed`, `CO-482`, `CO-400`.
- Not done if: retry remains possible in the same attempt, label requirements weaken, or the change becomes generic label projection.
- Pre-implementation issue-quality review: live issue-context confirmed the issue is `In Progress` after Ready transition and has no attached PR or blockers.
- Fallback / refactor decision: this touches the provider retry-suppression seam; retain the existing deterministic no-retry contract and extend it narrowly to the missing label-resolution failure code.
- Durable retention evidence: deterministic mutation suppression remains the supported provider-worker contract and will be guarded by focused tests.
- Large-refactor check: not needed; this is a one-code-family omission in the existing central suppression path.

## Milestones & Sequencing
1) Record parallelization decision and launch tests-only child lane.
2) Update deterministic mutation classification and CLI same-attempt suppression.
3) Integrate focused regression, run validation, standalone review, elegance pass, and PR handoff.

## Dependencies
- CO-482 live label fail-closed behavior remains upstream truth.
- Child lane owns only focused regression edits.

## Validation
- Checks / tests: focused retry suppression regression, targeted test command, build/lint/test/docs gates, standalone review, elegance review.
- Rollback plan: revert the two source changes and regression if suppression behavior conflicts with validation.

## Risks & Mitigations
- Risk: accidentally weakening label requirements. Mitigation: do not edit `resolveFollowUpLabelsFromSourceIssue` semantics.
- Risk: retry suppression hides a repairable state. Mitigation: instruction explicitly says to source-label and reread issue-context before a later retry.

## Approvals
- Reviewer: standalone review executed under `FORCE_CODEX_REVIEW=1`; post-fix output reported no actionable issues, but telemetry classified the clean prose as `review_verdict=unknown`, so the handoff uses a bounded review-verdict parser waiver recorded in the workpad.
- Date: 2026-05-14.
