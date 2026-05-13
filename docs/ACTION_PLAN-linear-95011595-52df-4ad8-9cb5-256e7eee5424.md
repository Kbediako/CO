# ACTION_PLAN - CO: stop released provider claims from burning Linear issue-by-id polls

## Added by Bootstrap 2026-04-12

## Summary
- Goal: close `CO-160` by making deferred polls fail closed for retained released claims instead of re-reading each issue by id, while preserving bounded reopen and cleanup behavior.
- Scope: docs-first packet, audited docs-review child stream, narrow `providerIssueHandoff.ts` change, focused regression coverage, and the normal validation and review gates.
- Assumptions:
  - `CO-159` already fixed dead active claims and completed review or merge wait cached fail-closed paths
  - the remaining defect is specific to retained released claims during ordinary deferred polls
  - the existing released-claim reopen helpers are the correct recovery seam to preserve

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `dispatch_source_issue_by_id`, `resolveTrackedIssue`, `trackedIssues: []`, `deferFreshDiscovery: true`, `provider_issue_released:not_active`, and `provider_issue_released:not_mutable`
- Not done if:
  - deferred polls still spend direct issue-by-id reads for retained released claims
  - fresh discovery still runs because of all-released retained claims
  - released claims lose bounded reopen behavior when newer evidence says they are runnable again
- Pre-implementation issue-quality review:
  - keep the lane bounded to released-claim deferred poll classification and related regressions; do not widen into global budget policy or scheduler redesign

## Milestones & Sequencing
1. Draft and register the `CO-160` docs-first packet, mirror the checklist, write the single workpad source, and run the audited `linear child-stream --pipeline docs-review` lane.
2. Implement the narrow deferred-poll fail-closed change for retained released claims in `providerIssueHandoff.ts`.
3. Add focused regressions proving zero direct issue-by-id reads and zero fresh discovery churn across two consecutive polls with 128 retained released claims, while keeping reopen and cleanup seams intact.
4. Run the required validation floor, then standalone review followed by the explicit elegance pass before any review handoff.

## Dependencies
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review --format json`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the deferred-poll released-claim fail-closed change together with its regressions if it suppresses genuinely runnable reopened work
  - preserve the existing released-claim reopen helpers and cleanup behavior as the rollback baseline

## Risks & Mitigations
- Risk: released claims that should be reopened get suppressed too aggressively.
  - Mitigation: scope the fail-closed behavior to deferred polls and only to locally terminal released reasons, while preserving pending-reopen and newer-evidence paths.
- Risk: the fix stops direct reads but still allows fresh discovery churn.
  - Mitigation: assert both direct-read and fresh-discovery suppression in the focused regression.
- Risk: the lane widens into unrelated budget or scheduler work.
  - Mitigation: keep the implementation and acceptance proof centered on `providerIssueHandoff.ts` and its tests.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-12
