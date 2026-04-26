# ACTION_PLAN - CO-392 live-started released-pending-reopen refresh

## Added by Bootstrap 2026-04-26

## Summary
- Goal: make control-host refresh recover or diagnose a stale no-run released-pending-reopen claim once live Linear truth becomes `In Progress/started`.
- Scope: docs packet, focused provider handoff regression, narrow refresh/reconcile repair, adjacent invariant validation, workpad/PR handoff.
- Assumptions: current `origin/main` already contains nearby CO-189/CO-193 behavior and the fix can reuse existing issue-by-id refresh and launch/requeue helpers.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `CO-379`, `provider-intake-state.json`, `released-pending-reopen`, `provider_issue_released_pending_reopen:provider_issue_released:not_active`, stale cached `Ready/unstarted`, live Linear `In Progress/started`, no `run_id`, no `run_manifest_path`, accepted/drained `POST /api/v1/refresh`, available provider capacity, missing `CO STATUS` active/running row.
- Not done if: refresh drains while the claim stays stale; the fix is display-only; same-issue workers can duplicate; CO-193/CO-189 regress.
- Pre-implementation issue-quality review: parent accepted the issue as a distinct started/no-run released-pending-reopen refresh gap, confirmed the live issue was already `In Progress`, and recorded a `parallelize_now` decision for a focused same-issue tests child lane before implementation.

## Milestones & Sequencing
1. Create CO-392 docs-first packet and registry mirrors.
2. Launch same-issue tests child lane for an independent CO-379 regression candidate; reject any patch that does not exercise the live-started direct-refresh defect.
3. Add focused failing regression for the CO-379 stale `Ready/unstarted` no-run released-pending-reopen shape.
4. Implement the smallest refresh/reconcile branch to spend one bounded direct issue-by-id probe and launch/requeue or record a concrete skip reason.
5. Run focused tests for the new regression plus CO-193/CO-189 adjacent coverage.
6. Run docs review, full validation, standalone review, elegance pass, PR attach, ready-review drain, and Linear handoff.

## Dependencies
- Linear issue-by-id resolver used by provider handoff refresh.
- Existing provider launcher/admission capacity logic.
- Existing provider intake summary and selected-run projection.

## Validation
- Checks / tests: focused `ProviderIssueHandoff.test.ts` cases, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/spec-guard.mjs --dry-run`, `node scripts/delegation-guard.mjs`, `node scripts/diff-budget.mjs`, manifest-backed forced standalone review, explicit elegance pass.
- Rollback plan: revert the narrow provider handoff change and regression; retained provider-intake data remains unchanged because no migration or state-file cleanup is introduced.

## Risks & Mitigations
- Risk: broad retained-claim polling increases Linear request burn. Mitigation: scope the issue-by-id refresh branch to the already recheckable released-pending-reopen live-started/no-run shape.
- Risk: duplicate same-issue worker launch. Mitigation: preserve existing same-issue run discovery, unreadable occupancy, release-cancel, and CO-189 tests.
- Risk: conflating CO-391 timeout/projection work. Mitigation: keep implementation in provider handoff refresh/reclaim and only touch status projection if needed for recovered intake truth.

## Approvals
- Reviewer: parent provider worker.
- Date: 2026-04-26.
