# ACTION_PLAN - CO STATUS: do not project invalidated child-lane failure summaries as current progress

## Added by Bootstrap 2026-04-16

## Summary
- Goal: close `CO-204` by making current progress projection ignore disposed child-lane summaries and stop using parent `decision_at` as child output freshness.
- Scope: provider issue observability projection helpers, focused tests, docs/task registration, workpad, validation, review, PR lifecycle, and Linear handoff.
- Assumptions:
  - `decision_at` is a parent disposition timestamp.
  - `launched_at` is the best available child-lane output proxy in the current child-lane summary shape.
  - historical child-lane proof records remain useful and must not be removed.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `CO STATUS`, `co-status --format json`, `provider-linear-worker-progress`, `child_lane_summary`, `provider-linear-worker-child-lanes.json`, `provider-linear-worker-proof.json`, `decision_at`, `decision=invalidated`, `launched_at`, replacement child lane, and `Child lane reserved before child run startup.`
- Not done if:
  - stale disposed child-lane summaries remain selectable as current progress.
  - `decision_at` refreshes a stale child summary.
  - active or pending child-lane summaries disappear.
  - proof artifacts lose historical child-lane evidence.
- Pre-implementation issue-quality review:
  - 2026-04-16: parent review confirms this is a status projection freshness bug, not a child-lane guardrail root-cause repair and not a scheduler redesign.

## Milestones & Sequencing
1. Inspect Linear workflow states, move `CO-204` from `Ready` to the team's started state, and create the single persistent workpad.
2. Record the pre-turn decomposition matrix and `parallelize_now` decision, then launch same-issue child lane `regression-tests` for focused coverage.
3. Accept or reject the child-lane patch based on scope and evidence.
4. Implement the parent-owned projection helper fix in `providerIssueObservability.ts`.
5. Run focused provider issue observability tests, then the required validation floor.
6. Run manifest-backed standalone review, perform an explicit elegance/minimality pass, refresh the workpad, open or update and attach the PR, drain `pr ready-review`, and hand off only after checks are green.

## Dependencies
- `orchestrator/src/cli/control/providerIssueObservability.ts`
- `orchestrator/tests/ProviderIssueObservability.test.ts`
- same-issue child-lane manifest `.runs/linear-9917183b-824a-48f7-95ee-bcee205d7a02-regression-tests/cli/2026-04-16T07-46-57-204Z-d0960b5a/manifest.json`

## Validation
- Checks / tests:
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueObservability.test.ts`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review
  - explicit elegance review
- Rollback plan:
  - revert the projection helper change and focused tests if active/pending child-lane progress is suppressed incorrectly.
  - do not roll back by deleting child-lane proof artifacts.

## Risks & Mitigations
- Risk: all child-lane failures disappear from current status.
  - Mitigation: keep pending/active child-lane summaries eligible and test that path.
- Risk: historical evidence is lost.
  - Mitigation: only filter current-progress candidates; do not mutate proof or child-lane records.
- Risk: ranking changes broaden beyond the observed bug.
  - Mitigation: localize the change to child-lane summary candidate eligibility and timestamp selection.

## Approvals
- Reviewer: manifest-backed standalone review succeeded with bounded-success and no actionable findings; explicit elegance review found no smaller safe patch.
- Date: 2026-04-16
