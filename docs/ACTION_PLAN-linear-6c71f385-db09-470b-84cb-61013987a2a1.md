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

## CO-382 Fallback Decision Table
- Large-refactor decision: no large refactor is warranted because CO-576 removes one stale current-projection branch inside the existing provider-intake completed-run rehydrate authority; it does not add a new source of truth or split queue/status/PR lifecycle ownership.
- Minor-seam decision: remove the stale current-projection seam now; retain only the existing completed-claim audit record as a durable audit contract.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `provider-intake current projection` | Completed promoted-review rows can project cached `Merging` / open review truth after PR merge and Linear terminal closeout. | `remove fallback` | CO-576 | Post-CO-516 recurrence for merged PRs with retained completed claims. | 2026-05-22 | 2026-05-25 | Removed in this issue | Current projection uses fresh Linear `Done` truth or explicit stale/degraded provenance, and terminal rows do not consume active work paths. | `orchestrator/tests/ProviderIssueHandoff.test.ts` focused stale promoted-review rehydrate regression plus full provider handoff suite. |
| `provider-intake completed-claim audit retention` | Completed claim history remains in `provider-intake-state.json` for audit and diagnosis. | `justify retaining fallback` | CO-576 | Historical provider-worker claims are intentionally retained after closeout. | 2026-05-22 | 2026-05-25 | Non-expiring durable audit retention only with rationale | Retention stays audit-only and never overrides live Linear/GitHub closeout truth. | Regression asserts the stale standalone promoted-review residue is cleared from current projection while released merge-closeout audit retention remains intact. |

Durable retention evidence:
- Contract name: `provider-intake completed-claim audit retention`.
- Owning surface: provider-intake state and status projection.
- Steady-state proof: retained completed rows remain readable for diagnostics while current projection comes from fresh Linear/GitHub truth or source-labeled degraded reads.
- Tests/docs: `orchestrator/tests/ProviderIssueHandoff.test.ts` stale promoted-review regression plus existing released merge-closeout audit-retention coverage; this CO-576 PRD, TECH_SPEC, ACTION_PLAN, and task checklist.
- Non-expiring rationale: completed-claim retention is the audit artifact, not an active fallback; only stale current projection is removed.

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
