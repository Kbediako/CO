# ACTION_PLAN - CO-346 skipped review prerequisite-stage truth

## Summary
- Goal: fix misleading skipped-review wording for known prerequisite-stage failures.
- Scope: docs-first packet, `TaskManager`, `CommandBuilder`, and focused tests.
- Assumptions: failed pipeline stages are identifiable from manifest `status_detail` or failed command records, and failed command error artifacts are available in the manifest command records.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `Review skipped: build stage failed.`, `delegation-guard`, `errors/01-delegation-guard.json`, `createSkippedReviewResult`.
- Not done if: guard-stage failures still look like generic build failures or true build failures are mislabeled.
- Pre-implementation issue-quality review: parent verified Linear CO-346 and the source evidence run before implementation.

## Milestones & Sequencing
1. Create docs-first packet and registry rows.
2. Implement prerequisite-stage skip wording and error artifact propagation.
3. Add focused tests for guard-stage and true build paths.
4. Run validation, review, PR, merge, and Linear closeout.

## Dependencies
- Linear CO-346.
- Existing manager and command-builder adapters.

## Validation
- Checks / tests: focused Vitest files, build, lint, docs gates, diff budget, standalone review.
- Rollback plan: revert this task packet and the focused manager/adapter/test changes.

## Risks & Mitigations
- Risk: overfitting to one `delegation-guard` run.
- Mitigation: derive stage names only from manifest failure evidence or failed command records, and keep fallback build wording when that evidence is absent.

## Approvals
- Reviewer: parent orchestrator
- Date: 2026-04-24
