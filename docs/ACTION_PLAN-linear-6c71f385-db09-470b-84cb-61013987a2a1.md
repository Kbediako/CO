# ACTION_PLAN - CO-576 reconcile terminal promoted-PR intake residue

## Summary
- Goal: make retained completed promoted-review provider-intake rows audit-only once live GitHub and Linear truth show merged PR plus `Done`.
- Scope: provider-intake projection/accounting, focused regressions, and docs explaining the post-CO-516 recurrence.
- Assumptions: audit history remains retained; current-state consumers must not treat terminal retained rows as active work.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `provider-intake-state.json`, `completed claim`, `provider_issue_review_promotion_promoted`, `issue_state=Merging`, `review_pr_state OPEN`, `merge_closeout=null`, `merged PR`, `Linear Done`, `CO-514`, `CO-518`, `CO-552`, `CO-565`, `CO-566`, `CO-573`.
- Not done if: terminal retained rows can still project current `Merging` or open review truth, consume active capacity, route retries, block queue progress, or raise stale alarms.
- Pre-implementation issue-quality review: CO-576 is not a micro-task because correctness depends on exact provider-intake artifact names, terminal closeout semantics, retained audit history, and live Linear/GitHub authority ordering.
- Fallback / refactor decision: remove the stale cached current-projection seam; justify retaining completed-claim audit history as a steady-state audit record.

## Milestones & Sequencing
1. Reproduce the stale residue shape from retained completed promoted-review claims.
2. Trace provider-intake current projection, active-capacity accounting, retry/blocker, and stale alarm consumers.
3. Implement the smallest source-labeled terminal/stale projection fix that preserves audit history.
4. Add focused regressions for merged PR plus Linear `Done` with null `merge_closeout`.
5. Run docs-review, implementation gates, standalone review, elegance pass, PR handoff, and ready-review drain.

## Dependencies
- Live Linear issue-context for CO-576 before any lifecycle transition.
- Current GitHub PR truth for listed historical PRs and any newer residue included by the implementation.
- Active WIP cap must remain under four; CO-557 is currently an active provider-worker lane.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - focused provider-intake regressions
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review and explicit elegance/minimality pass
- Rollback plan: revert source changes and docs packet registration for CO-576; no provider-intake state cleanup is performed.

## Risks & Mitigations
- Risk: conflating audit retention with current truth could hide useful diagnostics. Mitigation: retain completed claim fields and add explicit current projection/provenance.
- Risk: degraded live reads could falsely terminalize active work. Mitigation: fail closed with source-labeled stale/degraded truth when live verification is unavailable.
- Risk: broad status redesign. Mitigation: limit changes to provider-intake projection/accounting consumers needed by the acceptance criteria.

## Approvals
- Reviewer: pending docs-review.
- Date: 2026-05-25.
