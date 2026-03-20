# ACTION_PLAN - Coordinator Live Provider Child-Run Delegation-Guard Launch-Provenance Test Hermeticity Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Validate the current-tree delegation-guard test hermeticity behavior under ambient provider launch provenance, then rerun the local validation floor and the live `CO-2` replay to the next exact boundary.
- Scope: docs-first registration, delegated read-only analysis, docs review, validation of the existing test-helper/assertion behavior, full validation, live replay, and truthful closeout.
- Assumptions:
  - the real runtime/provider delegation contract is already correct enough to get the live child run past runtime `delegation-guard`
  - the current blocker is local to test harness hermeticity under a provider-started parent env
  - the existing control host remains live enough to reuse for replay proof

## Milestones & Sequencing
1. Register `1309` docs, mirrors, freshness entries, task snapshot, and delegated scout context with the exact live `04-test` failure statement.
2. Validate the current tree under ambient provider launch env; only implement a narrow hermeticity fix if that validation disproves the existing helper.
3. Run the required validation floor plus review/elegance passes, then replay `CO-2` against the existing control host and stop at the next exact blocker or success state.

## Dependencies
- Current stacked `1305`-`1308` worktree state
- [`tests/delegation-guard.spec.ts`](../tests/delegation-guard.spec.ts)
- [`scripts/delegation-guard.mjs`](../scripts/delegation-guard.mjs)
- Existing control-host advisory/provider-intake state and reused child-run lineage

## Validation
- Checks / tests:
  - docs-review for `1309`
  - targeted `npx vitest run tests/delegation-guard.spec.ts`
  - ambient provider-launch-env reproduction for the targeted delegation-guard coverage
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
  - explicit elegance review pass
- Rollback plan:
  - if the ambient-env repro disproves the hermeticity hypothesis, stop and update the docs before widening scope
  - if the live replay exposes a new downstream blocker after `test`, stop and record that blocker rather than broadening this lane

## Risks & Mitigations
- Risk: the live failure is misread as an unresolved hermeticity bug when the current tree already contains the narrow helper fix.
  - Mitigation: validate the ambient provider launch env case on the current tree before widening scope.
- Risk: a hermeticity fix accidentally strips real launch provenance from production flows.
  - Mitigation: keep changes confined to tests unless evidence forces a production-path edit.
- Risk: the live replay exposes another downstream blocker after `04-test`.
  - Mitigation: stop at that next exact blocker and record it explicitly.

## Approvals
- Reviewer: pending docs-review for `1309`
- Date: 2026-03-20
