# ACTION_PLAN - CO: decouple released-claim deferred-poll suppression from unrelated fresh discovery

## Added by Bootstrap 2026-04-13

## Summary
- Goal: prove whether released-only deferred-poll cached skips suppress unrelated runnable discovery and, if they do, land the smallest suppression-seam fix without reopening retained released direct reads.
- Scope: docs-first packet, initial workpad, audited docs-review child stream, focused `ProviderIssueHandoff` proof or fix, and the normal validation/review gates for a non-trivial diff.
- Assumptions:
  - `CO-160` already landed retained released-claim local fail-closed handling
  - the remaining design question is specifically the shared fresh-discovery suppression channel
  - the correct lane is to separate suppression decisions, not to redesign cadence or request-budget policy

## Current Status
- Proof complete: the focused mixed/unrelated runnable regression first failed on the pre-fix tree because released-only cached deferred-poll skips kept `fresh_discovery` from running.
- Implementation complete: `runRefreshCycle(...)` now uses `shouldSuppressFreshDiscoveryForPollFailClosedReason(...)` so `provider_issue_poll_cached_released_*` stays local-first without globally suppressing unrelated discovery, while deferred `fresh_discovery` still blocks replay of the same released issue and non-released cached fail-closed classes remain unchanged.
- Remaining closeout: refresh packet/workpad truth, rerun review after addressing the stale-doc finding, and complete final handoff validation.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `CO-160`, `CO-159`, `runRefreshCycle(...)`, `fresh_discovery`, `resolveTrackedIssue(...)`, `dispatch_source_issue_by_id`, and the released cached poll reason family
- Not done if:
  - the lane changes behavior without proving the unrelated runnable case
  - retained released claims regain direct issue-by-id reads
  - the implementation widens into cadence or budget redesign
- Pre-implementation issue-quality review:
  - keep the lane bounded to the released-only suppression seam and its regressions

## Milestones & Sequencing
1. Draft and register the `CO-161` docs-first packet, update the single workpad, and capture the initial current-truth read on the suppression seam.
2. Add focused regression coverage that proves or disproves whether released-only cached skips block unrelated runnable discovery when the retained claim set is fully released.
3. If the proof is real, implement the narrowest production change in `providerIssueHandoff.ts` and update the targeted regressions without touching unrelated cached fail-closed classes.
4. Run the audited `linear child-stream --pipeline docs-review` lane, then the required validation floor, standalone review, and the explicit elegance pass before any handoff.

## Dependencies
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review --format json`
  - focused `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts -t "<co-161 cases>"`
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
  - revert the suppression-seam change and its regressions together if the fix weakens non-released cached suppression or reintroduces retained released direct reads
  - keep the current `CO-160` retained released local-first baseline as the rollback target

## Risks & Mitigations
- Risk: the proof shows real unrelated runnable suppression, but the fix accidentally weakens non-released cached suppression.
  - Mitigation: keep the change isolated to release-only suppression classification and add direct regression coverage for the unaffected paths.
- Risk: the lane reintroduces fresh-discovery churn without documenting the explicit contract change.
  - Mitigation: keep the behavior change explicit in the PRD/TECH_SPEC/tests and tie it directly to `CO-161`.
- Risk: the lane widens into cadence or budget redesign.
  - Mitigation: reject any fix that requires new cadence policy or broad scheduler state.

## Approvals
- Reviewer: docs-review child stream completed; final parent-tree review closeout remains in progress
- Date: 2026-04-13
