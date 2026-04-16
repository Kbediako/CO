# ACTION_PLAN - Control host: reclaim Ready issues suppressed by plain released/not_active stale Blocked cache

## Added by Bootstrap 2026-04-16

## Summary
- Goal: close `CO-202` by letting provider handoff reclaim a live Ready/unstarted issue when stale local plain `released` / `provider_issue_released:not_active` cache metadata is the only suppressing evidence.
- Scope: provider handoff reclaim eligibility, focused regression coverage, docs/task registration, Linear workpad, validation, review, and PR lifecycle.
- Assumptions:
  - `provider-intake-state.json` remains the retained local claim ledger.
  - stale cached `Blocked` metadata can be older than live Ready/unstarted Linear truth.
  - same-issue live worker evidence and terminal issue-state evidence remain authoritative.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `provider-intake-state.json`, `provider_issue_released:not_active`, plain released/not_active, stale `issue_state=Blocked`, `Ready`, `unstarted`, `fresh_discovery`, `active_claims`, `provider_debug_snapshot.claim`, `co-status --format json`, `counts.running`, `counts.issues`, no live same-issue worker, no retry queued, and no retry due.
- Not done if:
  - stale plain released/not_active `Blocked` cache still suppresses live Ready pickup.
  - only released-pending-reopen is fixed.
  - terminal rows become reclaimable.
  - a live same-issue worker can be duplicated.
  - recovery depends on deleting local intake claims.
- Pre-implementation issue-quality review:
  - 2026-04-16: parent review confirms this lane is a provider-intake reclaim eligibility fix, not Linear filter cleanup or status-only projection. The exact protected surfaces and adjacent invariants make the micro-task path inappropriate.

## Milestones & Sequencing
1. Inspect Linear workflow states, move `CO-202` from `Ready` to the team's started state, and create the single persistent workpad.
2. Record the pre-turn decomposition matrix and `parallelize_now` decision, then launch same-issue child lane `plain-not-active-regression` for focused test coverage.
3. Accept the completed child-lane patch, refine focused tests, and implement the parent-owned provider handoff reclaim logic.
4. Register this docs-first packet and task mirrors so spec/delegation guards can cite the issue and accepted child-lane evidence.
5. Run focused provider handoff and CO STATUS/runtime slices, then run the required validation floor.
6. Run manifest-backed standalone review, perform an explicit elegance/minimality pass, refresh the workpad, open/attach the PR, drain `pr ready-review`, and hand off only after checks are green.

## Dependencies
- `provider-intake-state.json`
- `provider_issue_released:not_active`
- `provider_issue_released_pending_reopen:*`
- Linear workflow state classification
- provider handoff fresh-discovery logic
- same-issue process/run liveness checks
- `CO-189`, `CO-192`, and `CO-193` adjacent behavior

## Validation
- Checks / tests:
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "reclaims a Ready plain released not-active claim with stale cached Blocked state"`
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/ControlRuntime.test.ts -t "prunes terminal released completed provider rows from active dashboard issues|prunes stale in-progress provider rows when terminal released claim has no live worker|does not count a selected stale terminal provider claim as a running CO STATUS row|keeps released pending-reopen started provider workers visible while intake rehydrates"`
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
  - revert the provider handoff helper and test additions if reclaim misclassifies terminal or live-worker cases.
  - keep retained provider-intake and `.runs` artifacts available for incident audit.
  - do not roll back by deleting local provider-intake rows.

## Risks & Mitigations
- Risk: a cached active or review-handoff row is treated as stale inactive cache and reclaimed.
  - Mitigation: only recheck cached workflow states that are non-terminal, non-active, and non-handoff.
- Risk: terminal Done/cancelled cleanup regresses.
  - Mitigation: keep terminal cached states non-reclaimable and run CO STATUS/runtime projection slice.
- Risk: a live same-issue worker is duplicated.
  - Mitigation: preserve existing release-cancel and inactive-run checks before fresh discovery can reclaim.
- Risk: request burn increases.
  - Mitigation: thread reclaim through existing provider handoff refresh/fresh-discovery paths only.

## Approvals
- Reviewer: `codex-orchestrator review --uncommitted` completed with `review_outcome=bounded-success`; parent provider worker elegance review passed.
- Date: 2026-04-16
