# ACTION_PLAN - CO: Disambiguate historical attached PRs during deterministic merge closeout for reopened issues

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-104` / `8ef95d79-db42-411c-886c-99bdeee6492b`
- Linear URL: https://linear.app/asabeko/issue/CO-104/co-disambiguate-historical-attached-prs-during-deterministic-merge

## Goal
- Keep reopened `Merging` closeout autonomous when the active replacement PR is unambiguous, and keep unresolved ambiguity explicit and machine-readable.

## Milestones
1. Keep the docs-first packet, checklist mirrors, and single workpad current; retain the audited docs-review child-stream evidence.
2. Patch `providerMergeCloseout.ts` so same-repo attachment disambiguation ignores only older merged baggage, recovers an already-merged replacement PR over older stale open baggage, and persists selected / ignored / conflicting URLs.
3. Add focused regressions in `ProviderMergeCloseout`, `ProviderIssueHandoff`, and `ProviderIssueObservability`.
4. Run the validation floor, forced standalone review, explicit elegance pass, PR quiet-drain, and only then hand off to review.

## Validation
- Required proof: the `CO-81` historical `#360` plus replacement `#372` shape selects `#372` without manual cleanup; true ambiguity stays explicit; repo-mismatch and no-attached-PR behavior stay unchanged.
- Required checks: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, forced `npm run review`, `npm run pack:smoke`.
- Rollback: revert the disambiguation helper and additive record fields together if they misclassify candidates or lose persisted truth; reopen follow-up work rather than weakening fail-closed semantics.

## Risks
- Misclassifying a still-relevant PR as historical. Mitigation: ignore only merged attachments that are strictly older than the selected replacement candidate.
- Losing the new record fields during persistence or debug projection. Mitigation: keep additive fields only and cover persistence / observability with focused regressions.
